%lang starknet

from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.math import assert_le, assert_lt, assert_in_range, assert_not_zero
from starkware.cairo.common.math_cmp import is_le
from starkware.starknet.common.syscalls import (
    call_contract,
    get_caller_address,
    get_contract_address,
)
from starkware.cairo.common.bool import TRUE, FALSE

from util import assert_unique_elements

#
# Events
#

@event
func SubmitTransaction(signer : felt, nonce : felt, to : felt):
end

@event
func ConfirmTransaction(signer : felt, nonce : felt):
end

@event
func RevokeConfirmation(signer : felt, nonce : felt):
end

@event
func ExecuteTransaction(signer : felt, nonce : felt):
end

@event
func SignersSet(signers_len : felt, signers : felt*):
end

@event
func ThresholdSet(threshold : felt):
end

#
# Storage
#

struct Transaction:
    member to : felt
    member function_selector : felt
    member calldata_len : felt
    member executed : felt
    member threshold : felt
end

@storage_var
func _threshold() -> (res : felt):
end

@storage_var
func _signers_len() -> (res : felt):
end

@storage_var
func _signers(index : felt) -> (res : felt):
end

@storage_var
func _tx_valid_since() -> (res : felt):
    # setting new signers invalidates all pending transactions
    # contains transactions nonce since which transactions valid
end

@storage_var
func _is_signer(address : felt) -> (res : felt):
end

@storage_var
func _next_nonce() -> (res : felt):
end

@storage_var
func _transactions(nonce : felt, field : felt) -> (res : felt):
    # Field enum pattern described in https://hackmd.io/@RoboTeddy/BJZFu56wF#Concise-way
end

@storage_var
func _transaction_calldata(nonce : felt, calldata_index : felt) -> (res : felt):
end

@storage_var
func _is_confirmed(nonce : felt, signer : felt) -> (res : felt):
end

#
# Conditions
#

# Revert if the calling account is not a signer
func require_signer{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}():
    let (caller) = get_caller_address()
    let (is_caller_signer) = is_signer(address=caller)
    with_attr error_message("not signer"):
        assert is_caller_signer = TRUE
    end
    return ()
end

# Revert if tx does not exist
func require_tx_exists{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    nonce : felt
):
    let (next_nonce) = _next_nonce.read()
    with_attr error_message("tx does not exist"):
        assert_lt(nonce, next_nonce)
    end
    return ()
end

# Revert if tx has been executed
func require_not_executed{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    nonce : felt
):
    let (is_executed) = _transactions.read(nonce=nonce, field=Transaction.executed)
    with_attr error_message("tx already executed"):
        assert is_executed = FALSE
    end
    return ()
end

# Revert if tx has been confirmed for the calling account already
func require_not_confirmed{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    nonce : felt
):
    let (caller) = get_caller_address()
    let (is_confirmed_for_caller) = is_confirmed(nonce=nonce, signer=caller)
    with_attr error_message("tx already confirmed"):
        assert is_confirmed_for_caller = FALSE
    end
    return ()
end

# Revert if tx has not been confirmed for the calling account already
func require_confirmed{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    nonce : felt
):
    let (caller) = get_caller_address()
    let (is_confirmed_for_caller) = is_confirmed(nonce=nonce, signer=caller)
    with_attr error_message("tx not confirmed"):
        assert is_confirmed_for_caller = TRUE
    end
    return ()
end

# Revert if signers not unique
func require_unique_signers{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    signers_len : felt, signers : felt*
):
    with_attr error_message("signers not unique"):
        assert_unique_elements(signers_len, signers)
    end

    return ()
end

# Require nonce to be greater then the last update of set of signers.
# Since updating signers invalidates all pending transations
func require_tx_valid{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(nonce):
    let (tx_valid_since) = _tx_valid_since.read()

    with_attr error_message("tx invalidated: config changed after submission"):
        assert_le(tx_valid_since, nonce)
    end

    return ()
end

func require_multisig{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}():
    let (caller) = get_caller_address()
    let (contract_address) = get_contract_address()

    with_attr error_message("access restricted to multisig"):
        assert caller = contract_address
    end

    return ()
end

func require_valid_threshold{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    threshold : felt, signers_len : felt
):
    const lower_bound = 1

    # will throw if signers_len is 0 and if threshold
    # is not in range [1, signers_len]
    with_attr error_message("invalid parameters"):
        assert_in_range(threshold, lower_bound, signers_len + 1)
    end

    return ()
end

func require_valid_nonce{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    nonce : felt
):
    let (next_nonce) = _next_nonce.read()
    with_attr error_message("invalid nonce"):
        assert nonce = next_nonce
    end

    return ()
end

#
# Getters
#

@view
func is_signer{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    address : felt
) -> (res : felt):
    let (res) = _is_signer.read(address=address)
    return (res)
end

@view
func get_signers_len{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    signers_len : felt
):
    let (signers_len) = _signers_len.read()
    return (signers_len=signers_len)
end

@view
func get_signers{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    signers_len : felt, signers : felt*
):
    alloc_locals
    let (signers) = alloc()
    let (signers_len) = _signers_len.read()

    # Recursively add signers from storage to the signers array
    _get_signers(signers_index=0, signers_len=signers_len, signers=signers)
    return (signers_len=signers_len, signers=signers)
end

@view
func get_transactions_len{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    res : felt
):
    let (res) = _next_nonce.read()
    return (res)
end

@view
func get_threshold{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    threshold : felt
):
    let (threshold) = _threshold.read()
    return (threshold)
end

@view
func is_confirmed{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    nonce : felt, signer : felt
) -> (res : felt):
    let (res) = _is_confirmed.read(nonce=nonce, signer=signer)
    return (res)
end

@view
func is_executed{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    nonce : felt
) -> (res : felt):
    let (res) = _transactions.read(nonce=nonce, field=Transaction.executed)
    return (res)
end

func _get_transaction_calldata{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    nonce : felt, calldata_index : felt, calldata_len : felt, calldata : felt*
):
    if calldata_index == calldata_len:
        return ()
    end

    let (calldata_arg) = _transaction_calldata.read(nonce=nonce, calldata_index=calldata_index)
    assert calldata[calldata_index] = calldata_arg

    _get_transaction_calldata(
        nonce=nonce, calldata_index=calldata_index + 1, calldata_len=calldata_len, calldata=calldata
    )
    return ()
end

@view
func get_transaction{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    nonce : felt
) -> (tx : Transaction, tx_calldata_len : felt, tx_calldata : felt*):
    alloc_locals

    let (to) = _transactions.read(nonce=nonce, field=Transaction.to)
    let (function_selector) = _transactions.read(nonce=nonce, field=Transaction.function_selector)
    let (calldata_len) = _transactions.read(nonce=nonce, field=Transaction.calldata_len)
    let (executed) = _transactions.read(nonce=nonce, field=Transaction.executed)
    let (threshold) = _transactions.read(nonce=nonce, field=Transaction.threshold)
    let tx = Transaction(
        to=to,
        function_selector=function_selector,
        calldata_len=calldata_len,
        executed=executed,
        threshold=threshold,
    )

    let (calldata) = alloc()
    if calldata_len == 0:
        return (tx=tx, tx_calldata_len=calldata_len, tx_calldata=calldata)
    end

    # Recursively get more calldata args and add them to the list
    _get_transaction_calldata(
        nonce=nonce, calldata_index=0, calldata_len=calldata_len, calldata=calldata
    )
    return (tx=tx, tx_calldata_len=calldata_len, tx_calldata=calldata)
end

#
# Actions
#

@constructor
func constructor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    signers_len : felt, signers : felt*, threshold : felt
):
    require_valid_threshold(threshold, signers_len)

    _set_signers(signers_len, signers)
    _set_threshold(threshold)

    return ()
end

@external
func submit_transaction{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    to : felt, function_selector : felt, calldata_len : felt, calldata : felt*, nonce : felt
):
    alloc_locals
    require_signer()
    require_valid_nonce(nonce)

    # Store the tx descriptor
    _transactions.write(nonce=nonce, field=Transaction.to, value=to)
    _transactions.write(nonce=nonce, field=Transaction.function_selector, value=function_selector)
    _transactions.write(nonce=nonce, field=Transaction.calldata_len, value=calldata_len)

    # Recursively store the tx calldata
    _set_transaction_calldata(
        nonce=nonce, calldata_index=0, calldata_len=calldata_len, calldata=calldata
    )

    # Emit event & update tx count
    let (caller) = get_caller_address()
    SubmitTransaction.emit(signer=caller, nonce=nonce, to=to)
    _next_nonce.write(value=nonce + 1)

    return ()
end

@external
func confirm_transaction{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    nonce : felt
):
    require_signer()
    require_tx_exists(nonce=nonce)
    require_tx_valid(nonce=nonce)
    require_not_executed(nonce=nonce)
    require_not_confirmed(nonce=nonce)

    let (threshold) = _transactions.read(nonce=nonce, field=Transaction.threshold)
    _transactions.write(nonce=nonce, field=Transaction.threshold, value=threshold + 1)
    let (caller) = get_caller_address()
    _is_confirmed.write(nonce=nonce, signer=caller, value=TRUE)

    ConfirmTransaction.emit(signer=caller, nonce=nonce)
    return ()
end

@external
func revoke_confirmation{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    nonce : felt
):
    require_signer()
    require_tx_exists(nonce=nonce)
    require_tx_valid(nonce=nonce)
    require_not_executed(nonce=nonce)
    require_confirmed(nonce=nonce)

    let (threshold) = _transactions.read(nonce=nonce, field=Transaction.threshold)
    _transactions.write(nonce=nonce, field=Transaction.threshold, value=threshold - 1)
    let (caller) = get_caller_address()
    _is_confirmed.write(nonce=nonce, signer=caller, value=FALSE)

    RevokeConfirmation.emit(signer=caller, nonce=nonce)
    return ()
end

@external
func execute_transaction{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    nonce : felt
) -> (response_len : felt, response : felt*):
    require_tx_exists(nonce=nonce)
    require_tx_valid(nonce=nonce)
    require_not_executed(nonce=nonce)

    let (tx, tx_calldata_len, tx_calldata) = get_transaction(nonce=nonce)

    # Require minimum configured threshold
    let (threshold) = _threshold.read()
    with_attr error_message("need more confirmations"):
        assert_le(threshold, tx.threshold)
    end

    # Mark as executed
    _transactions.write(nonce=nonce, field=Transaction.executed, value=TRUE)
    let (caller) = get_caller_address()
    ExecuteTransaction.emit(signer=caller, nonce=nonce)

    # Actually execute it
    let response = call_contract(
        contract_address=tx.to,
        function_selector=tx.function_selector,
        calldata_size=tx_calldata_len,
        calldata=tx_calldata,
    )
    return (response_len=response.retdata_size, response=response.retdata)
end

# Sets threshold. The only way this can be invoked
# is via a recursive call from execute_transaction -> set_threshold.
@external
func set_threshold{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    threshold : felt
):
    require_multisig()

    let (signers_len) = _signers_len.read()
    require_valid_threshold(threshold, signers_len)

    _set_threshold(threshold)

    return ()
end

# Sets the signers field on the multisig. The only way this can be invoked
# is via a recursive call from execute_transaction -> set_signers.
# Threshold is decreased in case its' larger than number of new signers.
@external
func set_signers{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    signers_len : felt, signers : felt*
):
    alloc_locals
    require_multisig()

    _set_signers(signers_len, signers)

    let (local threshold) = _threshold.read()
    let (lt) = is_le(signers_len, threshold - 1)  # signers_len < threshold
    if lt == TRUE:
        _set_threshold(signers_len)
        return ()
    end

    return ()
end

# Set new signers and threshold.
# Can be called only via recursively from
# execute_transaction -> set_signers_and_threshold
@external
func set_signers_and_threshold{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    signers_len : felt, signers : felt*, threshold : felt
):
    require_multisig()
    require_valid_threshold(threshold, signers_len)

    _set_signers(signers_len, signers)
    _set_threshold(threshold)

    return ()
end

#
# Storage Helpers
#

func _get_signers{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    signers_index : felt, signers_len : felt, signers : felt*
):
    if signers_index == signers_len:
        return ()
    end

    let (signer) = _signers.read(index=signers_index)
    assert signers[signers_index] = signer

    _get_signers(signers_index=signers_index + 1, signers_len=signers_len, signers=signers)
    return ()
end

func _set_signers{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    signers_len : felt, signers : felt*
):
    alloc_locals
    require_unique_signers(signers_len, signers)

    # Clean previous signers
    let (old_signers_len) = _signers_len.read()
    _clean_signers_range(0, old_signers_len)

    let (tx_valid_since) = _next_nonce.read()
    _tx_valid_since.write(tx_valid_since)

    _signers_len.write(signers_len)
    # Recursively write the rest
    _set_signers_range(0, signers_len, signers)
    SignersSet.emit(signers_len, signers)

    return ()
end

func _set_signers_range{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    signers_index : felt, signers_len : felt, signers : felt*
):
    if signers_index == signers_len:
        return ()
    end

    # Write the current iteration to storage
    _signers.write(index=signers_index, value=[signers])
    _is_signer.write(address=[signers], value=TRUE)

    # Recursively write the rest
    _set_signers_range(
        signers_index=signers_index + 1, signers_len=signers_len, signers=signers + 1
    )
    return ()
end

func _set_transaction_calldata{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    nonce : felt, calldata_index : felt, calldata_len : felt, calldata : felt*
):
    if calldata_index == calldata_len:
        return ()
    end

    # Write the current iteration to storage
    _transaction_calldata.write(nonce=nonce, calldata_index=calldata_index, value=[calldata])

    # Recursively write the rest
    _set_transaction_calldata(
        nonce=nonce,
        calldata_index=calldata_index + 1,
        calldata_len=calldata_len,
        calldata=calldata + 1,
    )
    return ()
end

func _clean_signers_range{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    signers_index : felt, signers_len : felt
):
    if signers_index == signers_len:
        return ()
    end

    let (signer_address) = _signers.read(signers_index)
    _is_signer.write(signer_address, FALSE)
    _signers.write(signers_index, 0)

    return _clean_signers_range(signers_index + 1, signers_len)
end

func _set_threshold{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    threshold : felt
):
    _threshold.write(threshold)
    ThresholdSet.emit(threshold)

    return ()
end
