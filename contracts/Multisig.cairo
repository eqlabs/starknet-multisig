%lang starknet

from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.math import assert_le, assert_lt, assert_in_range, assert_not_zero
from starkware.cairo.common.math_cmp import is_le, is_not_zero
from starkware.starknet.common.syscalls import (
    call_contract,
    get_caller_address,
    get_contract_address,
)
from starkware.cairo.common.bool import TRUE, FALSE

from util import assert_unique_elements

// @title A multi-signature contract
// @author Equilibrium (equilibrium.co)
//

//
// Events
//

// @dev Event emitted when a new transaction is submitted
// @param signer: Creator of the transaction
// @param nonce: Transaction nonce
// @param to: Target address
@event
func TransactionSubmitted(signer: felt, nonce: felt, to: felt) {
}

// @dev Event emitted when a transaction has been confirmed by a signer
// @param signer: Transaction confirmer
// @param nonce: Transaction nonce
@event
func TransactionConfirmed(signer: felt, nonce: felt) {
}

// @dev Event emitted when a transaction confirmation has been revoked by a signer
// @param signer: Transaction confirmation revoker
// @param nonce: Transaction nonce
@event
func ConfirmationRevoked(signer: felt, nonce: felt) {
}

// @dev Event emitted when a transaction has been executed
// @param executer: Transaction executer
// @param nonce: Transaction nonce
@event
func TransactionExecuted(executer: felt, nonce: felt) {
}

// @dev Event emitted when the multisig's signer array has been changed
// @param signers_len: Amount of signers
// @param signers: An array of the new signers
@event
func SignersSet(signers_len: felt, signers: felt*) {
}

// @dev Event emitted when the multisig's threshold has been changed
// @param threshold: The new threshold
@event
func ThresholdSet(threshold: felt) {
}

//
// Storage
//

// @dev Represents stored transaction basic data inside the multisig
// @param to: What is the transaction target address
// @param function_selector: What is the transaction target function
// @param calldata_len: Length of the calldata
// @param executed: Has the transaction been executed
// @param confirmations: How many confirmations the transaction has
struct Transaction {
    to: felt,
    function_selector: felt,
    calldata_len: felt,
    executed: felt,
    confirmations: felt,
}

@storage_var
func _threshold() -> (res: felt) {
}

@storage_var
func _signers_len() -> (res: felt) {
}

@storage_var
func _signers(index: felt) -> (res: felt) {
}

@storage_var
func _tx_valid_since() -> (res: felt) {
    // setting new signers invalidates all pending transactions
    // contains transactions nonce since which transactions valid
}

@storage_var
func _is_signer(address: felt) -> (res: felt) {
}

@storage_var
func _next_nonce() -> (res: felt) {
}

@storage_var
func _transactions(nonce: felt, field: felt) -> (res: felt) {
    // Field enum pattern described in https://hackmd.io/@RoboTeddy/BJZFu56wF#Concise-way
}

@storage_var
func _transaction_calldata(nonce: felt, calldata_index: felt) -> (res: felt) {
}

@storage_var
func _is_confirmed(nonce: felt, signer: felt) -> (res: felt) {
}

//
// Conditions
//

// @dev Requires that the caller is the a signer
// Revert if the calling account is not a signer
func require_signer{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() {
    let (caller) = get_caller_address();
    let (is_caller_signer) = is_signer(address=caller);
    with_attr error_message("Invalid signer") {
        assert is_caller_signer = TRUE;
    }
    return ();
}

// @dev Requires that the transaction exists. Reverts if the tx doesn't exist
// @param nonce: Nonce of the transaction in question
func require_tx_exists{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    nonce: felt
) {
    let (next_nonce) = _next_nonce.read();
    with_attr error_message("Transaction does not exist") {
        assert_lt(nonce, next_nonce);
    }
    return ();
}

// @dev Requires that the transaction hasn't been executed yet. Reverts if the tx has been executed
// @param nonce: Nonce of the transaction in question
func require_not_executed{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    nonce: felt
) {
    let (is_executed) = _transactions.read(nonce=nonce, field=Transaction.executed);
    with_attr error_message("Transaction already executed") {
        assert is_executed = FALSE;
    }
    return ();
}

// @dev Requires that the transaction hasn't been confirmed by the caller already.
// Reverts if the tx has been confirmed by the caller already
// @param nonce: Nonce of the transaction in question
func require_not_confirmed{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    nonce: felt
) {
    let (caller) = get_caller_address();
    let (is_confirmed_for_caller) = is_confirmed(nonce=nonce, signer=caller);
    with_attr error_message("Transaction already confirmed") {
        assert is_confirmed_for_caller = FALSE;
    }
    return ();
}

// @dev Requires that the transaction has been confirmed by the caller already.
// Reverts if the tx has not been confirmed by the caller already
// @param nonce: Nonce of the transaction in question
func require_confirmed{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    nonce: felt
) {
    let (caller) = get_caller_address();
    let (is_confirmed_for_caller) = is_confirmed(nonce=nonce, signer=caller);
    with_attr error_message("Transaction not confirmed") {
        assert is_confirmed_for_caller = TRUE;
    }
    return ();
}

// @dev Requires that the given array of signers has only unique entries
// Reverts if there are duplicate values
// @param signers_len: How many signers are in the array
// @param signers: Array of signers
func require_unique_signers{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    signers_len: felt, signers: felt*
) {
    with_attr error_message("Signers not unique") {
        assert_unique_elements(signers_len, signers);
    }

    return ();
}

// @dev Requires that the nonce is greater than the last (possible) invalidated nonce.
// Updating the list of signers or threshold updates the invalidation nonce.
// Reverts if the transaction has a nonce which has been invalidated
// @param nonce: Nonce of the transaction in question
func require_tx_valid{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(nonce) {
    let (tx_valid_since) = _tx_valid_since.read();

    with_attr error_message("Transaction invalidated: config changed after submission") {
        assert_le(tx_valid_since, nonce);
    }

    return ();
}

// @dev Requires that caller is the multisig itself
// Reverts if the caller is not the multisig
func require_multisig{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() {
    let (caller) = get_caller_address();
    let (contract_address) = get_contract_address();

    with_attr error_message("Access denied - only multisig allowed") {
        assert caller = contract_address;
    }

    return ();
}

// @dev Requires that the given threshold is valid based on the amount of signers
// Reverts if the given threshold is not valid
// @param threshold: Threshold to check
// @param signers_len: Amount of signers in the multisig
func require_valid_threshold{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    threshold: felt, signers_len: felt
) {
    const lower_bound = 1;

    // we allow threshold to be 0
    // if and only if signers_len is 0
    let x = is_not_zero(threshold);
    let y = is_not_zero(signers_len);
    if (x + y == 0) {
        return ();
    }

    // will throw if signers_len is 0 and if threshold
    // is not in range [1, signers_len]
    with_attr error_message("Invalid threshold") {
        assert_in_range(threshold, lower_bound, signers_len + 1);
    }

    return ();
}

// @dev Requires that the given nonce is valid
// Reverts if the given nonce is not valid
// @param nonce: Nonce to check
func require_valid_nonce{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    nonce: felt
) {
    let (next_nonce) = _next_nonce.read();
    with_attr error_message("Invalid nonce") {
        assert nonce = next_nonce;
    }

    return ();
}

//
// Getters
//

// @dev Checks whether the given address is a signer
// @param address: Address to check
// @return res: 1 if the address is a signer, 0 otherwise
@view
func is_signer{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(address: felt) -> (
    res: felt
) {
    let (res) = _is_signer.read(address=address);
    return (res,);
}

// @dev Gets the amount of signers
// @return signers_len: Amount of signers
@view
func get_signers_len{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() -> (
    signers_len: felt
) {
    let (signers_len) = _signers_len.read();
    return (signers_len=signers_len);
}

// @dev Gets the array of signers
// @return signers_len: Amount of signers
// @return signers: Array of signers
@view
func get_signers{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() -> (
    signers_len: felt, signers: felt*
) {
    alloc_locals;
    let (signers) = alloc();
    let (signers_len) = _signers_len.read();

    // Recursively add signers from storage to the signers array
    _get_signers_range(signers_index=0, signers_len=signers_len, signers=signers);
    return (signers_len=signers_len, signers=signers);
}

// @dev Gets the current multisig threshold
// @return threshold: Threshold
@view
func get_threshold{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() -> (
    threshold: felt
) {
    let (threshold) = _threshold.read();
    return (threshold,);
}

// @dev Gets the amount of transactions (executed and non-executed)
// @return res: Amount of transactions
@view
func get_transactions_len{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() -> (
    res: felt
) {
    let (res) = _next_nonce.read();
    return (res,);
}

// @dev Checks whether the given signer has confirmed the given transaction
// @param nonce: Transaction nonce to check
// @param signer: Signer to check
// @return res: 1 if has confirmed, 0 otherwise
@view
func is_confirmed{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    nonce: felt, signer: felt
) -> (res: felt) {
    let (res) = _is_confirmed.read(nonce=nonce, signer=signer);
    return (res,);
}

// @dev Checks whether the given transaction has been executed
// @param nonce: Transaction nonce to check
// @return res: 1 if has executed, 0 otherwise
@view
func is_executed{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(nonce: felt) -> (
    res: felt
) {
    let (res) = _transactions.read(nonce=nonce, field=Transaction.executed);
    return (res,);
}

// @dev Gets transaction data
// @param nonce: Transaction nonce
// @return tx: Transaction basic data
// @return tx_calldata_len: Transaction calldata length
// @return tx_calldata: Transaction calldata
@view
func get_transaction{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    nonce: felt
) -> (tx: Transaction, tx_calldata_len: felt, tx_calldata: felt*) {
    alloc_locals;

    let (to) = _transactions.read(nonce=nonce, field=Transaction.to);
    let (function_selector) = _transactions.read(nonce=nonce, field=Transaction.function_selector);
    let (calldata_len) = _transactions.read(nonce=nonce, field=Transaction.calldata_len);
    let (executed) = _transactions.read(nonce=nonce, field=Transaction.executed);
    let (confirmations) = _transactions.read(nonce=nonce, field=Transaction.confirmations);
    let tx = Transaction(
        to=to,
        function_selector=function_selector,
        calldata_len=calldata_len,
        executed=executed,
        confirmations=confirmations,
    );

    let (calldata) = alloc();
    if (calldata_len == 0) {
        return (tx=tx, tx_calldata_len=calldata_len, tx_calldata=calldata);
    }

    // Recursively get more calldata args and add them to the list
    _get_transaction_calldata_range(
        nonce=nonce, calldata_index=0, calldata_len=calldata_len, calldata=calldata
    );
    return (tx=tx, tx_calldata_len=calldata_len, tx_calldata=calldata);
}

//
// Actions
//

// @dev Creates a new multisig contract
// @param signers_len: How many signers
// @param signers: Array of signers
// @param threshold: Multisig threshold
@constructor
func constructor{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    signers_len: felt, signers: felt*, threshold: felt
) {
    require_valid_threshold(threshold, signers_len);

    _set_signers(signers_len, signers);
    _set_threshold(threshold);

    return ();
}

// @dev submits a new transaction for the multisig
// @param to: What is the transaction target address
// @param function_selector: What is the transaction target function
// @param calldata_len: Length of the calldata
// @param calldata: Calldata array
// @param nonce: Transaction nonce. Has to be the next non-used nonce
@external
func submit_transaction{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    to: felt, function_selector: felt, calldata_len: felt, calldata: felt*, nonce: felt
) {
    alloc_locals;
    require_signer();
    require_valid_nonce(nonce);

    // Store the tx descriptor
    _transactions.write(nonce=nonce, field=Transaction.to, value=to);
    _transactions.write(nonce=nonce, field=Transaction.function_selector, value=function_selector);
    _transactions.write(nonce=nonce, field=Transaction.calldata_len, value=calldata_len);

    // Recursively store the tx calldata
    _set_transaction_calldata_range(
        nonce=nonce, calldata_index=0, calldata_len=calldata_len, calldata=calldata
    );

    // Emit event & update tx count
    let (caller) = get_caller_address();
    TransactionSubmitted.emit(signer=caller, nonce=nonce, to=to);
    _next_nonce.write(value=nonce + 1);

    return ();
}

// @dev Confirms an existing transaction
// @param nonce: Transaction nonce to confirm
@external
func confirm_transaction{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    nonce: felt
) {
    require_signer();
    require_tx_exists(nonce=nonce);
    require_tx_valid(nonce=nonce);
    require_not_executed(nonce=nonce);
    require_not_confirmed(nonce=nonce);

    let (confirmations) = _transactions.read(nonce=nonce, field=Transaction.confirmations);
    _transactions.write(nonce=nonce, field=Transaction.confirmations, value=confirmations + 1);
    let (caller) = get_caller_address();
    _is_confirmed.write(nonce=nonce, signer=caller, value=TRUE);

    TransactionConfirmed.emit(signer=caller, nonce=nonce);
    return ();
}

// @dev Revoke an already given confirmation for a transaction
// @param nonce: Transaction nonce to revoke a confirmation for
@external
func revoke_confirmation{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    nonce: felt
) {
    require_signer();
    require_tx_exists(nonce=nonce);
    require_tx_valid(nonce=nonce);
    require_not_executed(nonce=nonce);
    require_confirmed(nonce=nonce);

    let (confirmations) = _transactions.read(nonce=nonce, field=Transaction.confirmations);
    _transactions.write(nonce=nonce, field=Transaction.confirmations, value=confirmations - 1);
    let (caller) = get_caller_address();
    _is_confirmed.write(nonce=nonce, signer=caller, value=FALSE);

    ConfirmationRevoked.emit(signer=caller, nonce=nonce);
    return ();
}

// @dev Execute a transaction
// @param nonce: Transaction nonce to execute
@external
func execute_transaction{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    nonce: felt
) -> (response_len: felt, response: felt*) {
    require_tx_exists(nonce=nonce);
    require_tx_valid(nonce=nonce);
    require_not_executed(nonce=nonce);

    let (tx, tx_calldata_len, tx_calldata) = get_transaction(nonce=nonce);

    // Require minimum configured threshold
    let (threshold) = _threshold.read();
    with_attr error_message("More confirmations required") {
        assert_le(threshold, tx.confirmations);
    }

    // Mark as executed
    _transactions.write(nonce=nonce, field=Transaction.executed, value=TRUE);
    let (caller) = get_caller_address();
    TransactionExecuted.emit(executer=caller, nonce=nonce);

    // Actually execute it
    let response = call_contract(
        contract_address=tx.to,
        function_selector=tx.function_selector,
        calldata_size=tx_calldata_len,
        calldata=tx_calldata,
    );
    return (response_len=response.retdata_size, response=response.retdata);
}

// @dev Sets a new threshold. The only way this can be invoked
// is via a recursive call from execute_transaction -> set_threshold.
// @param threshold: New threshold
@external
func set_threshold{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    threshold: felt
) {
    require_multisig();

    let (signers_len) = _signers_len.read();
    require_valid_threshold(threshold, signers_len);

    _set_threshold(threshold);

    return ();
}

// @dev Sets a new array of signers. The only way this can be invoked
// is via a recursive call from execute_transaction -> set_signers.
// Threshold is automatically decreased if it's larger than the new number of signers.
// @param signers_len: New amount of signers
// @param signers: New array of signers
@external
func set_signers{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    signers_len: felt, signers: felt*
) {
    alloc_locals;
    require_multisig();

    _set_signers(signers_len, signers);

    let (local threshold) = _threshold.read();
    let lt = is_le(signers_len, threshold - 1);  // signers_len < threshold
    if (lt == TRUE) {
        require_valid_threshold(signers_len, signers_len);
        _set_threshold(signers_len);
        return ();
    }

    return ();
}

// @dev Sets a new array of signers and a new threshold. The only way this can be invoked
// is via a recursive call from execute_transaction -> set_signers_and_threshold.
// @param signers_len: New amount of signers
// @param signers: New array of signers
// @param threshold: New threshold
@external
func set_signers_and_threshold{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    signers_len: felt, signers: felt*, threshold: felt
) {
    require_multisig();
    require_valid_threshold(threshold, signers_len);

    _set_signers(signers_len, signers);
    _set_threshold(threshold);

    return ();
}

//
// Storage Helpers
//

func _get_signers_range{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    signers_index: felt, signers_len: felt, signers: felt*
) {
    if (signers_index == signers_len) {
        return ();
    }

    let (signer) = _signers.read(index=signers_index);
    assert signers[signers_index] = signer;

    _get_signers_range(signers_index=signers_index + 1, signers_len=signers_len, signers=signers);
    return ();
}

func _set_signers{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    signers_len: felt, signers: felt*
) {
    alloc_locals;
    require_unique_signers(signers_len, signers);

    // Clean previous signers
    let (old_signers_len) = _signers_len.read();
    _clean_signers_range(0, old_signers_len);

    let (tx_valid_since) = _next_nonce.read();
    _tx_valid_since.write(tx_valid_since);

    _signers_len.write(signers_len);
    // Recursively write the rest
    _set_signers_range(0, signers_len, signers);
    SignersSet.emit(signers_len, signers);

    return ();
}

func _set_signers_range{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    signers_index: felt, signers_len: felt, signers: felt*
) {
    if (signers_index == signers_len) {
        return ();
    }

    // Write the current iteration to storage
    _signers.write(index=signers_index, value=[signers]);
    _is_signer.write(address=[signers], value=TRUE);

    // Recursively write the rest
    _set_signers_range(
        signers_index=signers_index + 1, signers_len=signers_len, signers=signers + 1
    );
    return ();
}

func _set_transaction_calldata_range{
    syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr
}(nonce: felt, calldata_index: felt, calldata_len: felt, calldata: felt*) {
    if (calldata_index == calldata_len) {
        return ();
    }

    // Write the current iteration to storage
    _transaction_calldata.write(nonce=nonce, calldata_index=calldata_index, value=[calldata]);

    // Recursively write the rest
    _set_transaction_calldata_range(
        nonce=nonce,
        calldata_index=calldata_index + 1,
        calldata_len=calldata_len,
        calldata=calldata + 1,
    );
    return ();
}

func _clean_signers_range{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    signers_index: felt, signers_len: felt
) {
    if (signers_index == signers_len) {
        return ();
    }

    let (signer_address) = _signers.read(signers_index);
    _is_signer.write(signer_address, FALSE);
    _signers.write(signers_index, 0);

    return _clean_signers_range(signers_index + 1, signers_len);
}

func _get_transaction_calldata_range{
    syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr
}(nonce: felt, calldata_index: felt, calldata_len: felt, calldata: felt*) {
    if (calldata_index == calldata_len) {
        return ();
    }

    let (calldata_arg) = _transaction_calldata.read(nonce=nonce, calldata_index=calldata_index);
    assert calldata[calldata_index] = calldata_arg;

    _get_transaction_calldata_range(
        nonce=nonce, calldata_index=calldata_index + 1, calldata_len=calldata_len, calldata=calldata
    );
    return ();
}

func _set_threshold{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    threshold: felt
) {
    _threshold.write(threshold);
    ThresholdSet.emit(threshold);

    return ();
}
