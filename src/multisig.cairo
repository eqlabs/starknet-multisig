use array::ArrayTrait;
use option::OptionTrait;
use starknet::ContractAddress;

#[abi]
trait IMultisig {
    #[view]
    fn is_signer(address: ContractAddress) -> bool;

    #[view]
    fn get_signers_len() -> usize;

    #[view]
    fn get_signers() -> Array<ContractAddress>;

    #[view]
    fn get_threshold() -> usize;

    #[view]
    fn get_transactions_len() -> u128;

    #[view]
    fn is_confirmed(nonce: u128, signer: ContractAddress) -> bool;

    #[view]
    fn is_executed(nonce: u128) -> bool;

    #[view]
    fn get_transaction(nonce: u128) -> (Multisig::Transaction, Array::<felt252>);

    #[view]
    fn type_and_version() -> felt252;

    #[external]
    fn submit_transaction(
        to: ContractAddress, function_selector: felt252, function_calldata: Array<felt252>, nonce: u128
    );

    #[external]
    fn confirm_transaction(nonce: u128);

    #[external]
    fn revoke_confirmation(nonce: u128);

    #[external]
    fn execute_transaction(nonce: u128) -> Array<felt252>;

    #[external]
    fn set_threshold(threshold: usize);

    #[external]
    fn set_signers(signers: Array<ContractAddress>);

    #[external]
    fn set_signers_and_threshold(signers: Array<ContractAddress>, threshold: usize);
}

/// Reverts if the provided array has duplicated values
/// # Arguments
/// * `arr` - The array to check duplicates for
fn assert_unique_values<T,
    impl TCopy: Copy<T>,
    impl TDrop: Drop<T>,
    impl TPartialEq: PartialEq<T>,
>(
    arr: @Array::<T>
) {
    let len = arr.len();

    let mut i1 : usize = 0;
    loop {
        
        if (i1 == len) {
            break ();
        }
        let mut i2 : usize = i1 + 1_usize;
        loop {
        
            if (i2 == len) {
                break ();
            }
            assert(*arr.at(i1) != *arr.at(i2), 'duplicate values');

            i2 += 1_usize;
        };

        i1 += 1_usize;
    };
}

#[contract]
mod Multisig {
    use super::assert_unique_values;

    use traits::Into;
    use traits::TryInto;
    use array::ArrayTrait;
    use array::ArrayTCloneImpl;
    use option::OptionTrait;
    use serde::Serde;

    use starknet::ContractAddress;
    use starknet::ContractAddressIntoFelt252;
    use starknet::Felt252TryIntoContractAddress;
    use starknet::StorageAccess;
    use starknet::StorageBaseAddress;
    use starknet::SyscallResult;
    use starknet::call_contract_syscall;
    use starknet::get_caller_address;
    use starknet::get_contract_address;
    use starknet::storage_address_from_base_and_offset;
    use starknet::storage_read_syscall;
    use starknet::storage_write_syscall;    

    use debug::PrintTrait;

    #[event]
    fn TransactionSubmitted(signer: ContractAddress, nonce: u128, to: ContractAddress) {}

    #[event]
    fn TransactionConfirmed(signer: ContractAddress, nonce: u128) {}

    #[event]
    fn ConfirmationRevoked(signer: ContractAddress, nonce: u128) {}

    #[event]
    fn TransactionExecuted(executor: ContractAddress, nonce: u128) {}

    #[event]
    fn SignersSet(signers: Array<ContractAddress>) {}

    #[event]
    fn ThresholdSet(threshold: usize) {}

    impl TransactionStorageAccess of StorageAccess<Transaction> {
        fn read(address_domain: u32, base: StorageBaseAddress) -> SyscallResult::<Transaction> {
            Result::Ok(
                Transaction {
                    to: storage_read_syscall(
                        address_domain, storage_address_from_base_and_offset(base, 0_u8)
                    )?.try_into().unwrap(),
                    function_selector: storage_read_syscall(
                        address_domain, storage_address_from_base_and_offset(base, 1_u8)
                    )?,
                    calldata_len: storage_read_syscall(
                        address_domain, storage_address_from_base_and_offset(base, 2_u8)
                    )?.try_into().unwrap(),
                    executed: if storage_read_syscall(
                        address_domain, storage_address_from_base_and_offset(base, 3_u8)
                    )? == 1 {
                        true
                    } else {
                        false
                    },
                    confirmations: storage_read_syscall(
                        address_domain, storage_address_from_base_and_offset(base, 4_u8)
                    )?.try_into().unwrap(),
                }
            )
        }

        fn write(
            address_domain: u32, base: StorageBaseAddress, value: Transaction
        ) -> SyscallResult::<()> {
            storage_write_syscall(
                address_domain, storage_address_from_base_and_offset(base, 0_u8), value.to.into(), 
            )?;
            storage_write_syscall(
                address_domain,
                storage_address_from_base_and_offset(base, 1_u8),
                value.function_selector,
            )?;
            storage_write_syscall(
                address_domain,
                storage_address_from_base_and_offset(base, 2_u8),
                value.calldata_len.into(),
            )?;
            storage_write_syscall(
                address_domain,
                storage_address_from_base_and_offset(base, 3_u8),
                if value.executed {
                    1
                } else {
                    0
                },
            )?;
            storage_write_syscall(
                address_domain,
                storage_address_from_base_and_offset(base, 4_u8),
                value.confirmations.into()
            )
        }
    }

    #[derive(Copy, Drop, Serde)]
    struct Transaction {
        to: ContractAddress,
        function_selector: felt252,
        calldata_len: usize,
        executed: bool,
        confirmations: usize,
    }

    struct Storage {
        _threshold: usize,
        _signers: LegacyMap<usize, ContractAddress>,
        _is_signer: LegacyMap<ContractAddress, bool>,
        _signers_len: usize,
        _tx_valid_since: u128,
        _next_nonce: u128,
        _transactions: LegacyMap<u128, Transaction>,
        _transaction_calldata: LegacyMap<(u128, usize), felt252>,
        _is_confirmed: LegacyMap<(u128, ContractAddress), bool>,
    }

    /// Constructor called only upon deployment
    /// # Arguments
    /// * `signers` - An array of signers for the multisig
    /// * `threshold` - Required amount of signer confirmation for executing transactions
    #[constructor]
    fn constructor(signers: Array<ContractAddress>, threshold: usize) {
        let signers_len = signers.len();
        _require_valid_threshold(threshold, signers_len);
        _set_signers(signers, signers_len);
        _set_threshold(threshold);
    }

    /// Views

    /// Checks whether the provided address is a signer
    /// # Arguments
    /// * `address` - The address to check for
    /// # Returns
    /// * `bool` - true if the address is a signer, false otherwise
    #[view]
    fn is_signer(address: ContractAddress) -> bool {
        _is_signer::read(address)
    }

    /// Check how many signers there are
    /// # Returns
    /// * `usize` - The amount of signers
    #[view]
    fn get_signers_len() -> usize {
        _signers_len::read()
    }

    /// Gets the list of signers
    /// # Returns
    /// * `Array<ContractAddress>` - An array of signers
    #[view]
    fn get_signers() -> Array<ContractAddress> {
        let signers_len = _signers_len::read();
        let mut signers = ArrayTrait::new();

        let mut i : usize = 0;
        loop {
            
            if (i == signers_len) {
                break ();
            }
            signers.append(_signers::read(i));
            i = i + 1_usize;
        };
        
        signers
    }

    /// Get the current threshold
    /// # Returns
    /// * `usize` - The current threshold
    #[view]
    fn get_threshold() -> usize {
        _threshold::read()
    }

    /// Gets the amount of submitted transactions
    /// # Returns
    /// * `u128` - Amount of submitted (executed and non-executed) transactions
    #[view]
    fn get_transactions_len() -> u128 {
        _next_nonce::read()
    }

    /// Gets information on whether a transaction has been confirmed by a specific signer
    /// # Arguments
    /// * `nonce` - Nonce of the transaction to check
    /// * `signer` - Address of the signer to check
    /// # Returns
    /// * `bool` - true if the signer has confirmed the said transaction, false otherwise
    #[view]
    fn is_confirmed(nonce: u128, signer: ContractAddress) -> bool {
        _is_confirmed::read((nonce, signer))
    }

    /// Gets information on whether a transaction has been executed
    /// # Arguments
    /// * `nonce` - Nonce of the transaction to check
    /// # Returns
    /// * `bool` - true if the transaction has been executed, false otherwise
    #[view]
    fn is_executed(nonce: u128) -> bool {
        let transaction = _transactions::read(nonce);
        transaction.executed
    }

    /// Gets transaction data
    /// # Arguments
    /// * `nonce` - Nonce of the transaction
    /// # Returns
    /// * `(Transaction, Array::<felt252>)` - A tuple where the first value is the basic transaction data and 
    /// the second entry is the transaction's calldata 
    #[view]
    fn get_transaction(nonce: u128) -> (Transaction, Array::<felt252>) {
        let transaction = _transactions::read(nonce);

        let mut function_calldata = ArrayTrait::new();
        let calldata_len = transaction.calldata_len;

        _get_transaction_calldata(nonce, calldata_len, ref function_calldata);

        (transaction, function_calldata)
    }

    /// Gets generic contract information
    /// # Returns
    /// * `felt252` - A short string giving information about the contract. Used for introspection
    #[view]
    fn type_and_version() -> felt252 {
        'Multisig 1.0.0'
    }

    /// Externals

    /// TODO: is upgradeability needed or not
    // #[external]
    // fn upgrade(new_impl: ClassHash) {
    //     _require_multisig();
    //     Upgradeable::upgrade(new_impl)
    // }

    /// Submit a transaction. Can only be called by a signer.
    /// # Arguments
    /// * `to` - Target of the transaction. Can be also this contract if changing multisig settings
    /// * `function_selector` - Selector for the function to call
    /// * `function_calldata` - Serialized calldata
    /// * `nonce` - Next available nonce
    #[external]
    fn submit_transaction(
        to: ContractAddress, function_selector: felt252, function_calldata: Array<felt252>, nonce: u128
    ) {
        _require_signer();
        _require_valid_nonce(nonce);

        let calldata_len = function_calldata.len();

        let transaction = Transaction {
            to: to,
            function_selector: function_selector,
            calldata_len: calldata_len,
            executed: false,
            confirmations: 0_usize
        };
        _transactions::write(nonce, transaction);

        let mut i : usize = 0;
        loop {
            
            if (i == calldata_len) {
                break ();
            }
            _transaction_calldata::write((nonce, i), *function_calldata.at(i));
            i = i + 1_usize;
        };

        let caller = get_caller_address();
        TransactionSubmitted(caller, nonce, to);
        _next_nonce::write(nonce + 1_u128);
    }

    /// Confirm a submitted transaction. Can only be called by a signer.
    /// # Arguments
    /// * `nonce` - Nonce for the transaction to confirm
    #[external]
    fn confirm_transaction(nonce: u128) {
        _require_signer();
        _require_tx_exists(nonce);
        _require_tx_valid(nonce);
        _require_not_executed(nonce);
        _require_not_confirmed(nonce);

        // TODO: write a single field instead of the whole transaction?
        let mut transaction = _transactions::read(nonce);
        transaction.confirmations += 1_usize;
        _transactions::write(nonce, transaction);

        let caller = get_caller_address();
        _is_confirmed::write((nonce, caller), true);

        TransactionConfirmed(caller, nonce);
    }

    /// Revokes a previously given transaction confirmation. Can only be called by a signer.
    /// # Arguments
    /// * `nonce` - Nonce for the transaction to revoke a confirmation for
    #[external]
    fn revoke_confirmation(nonce: u128) {
        _require_signer();
        _require_tx_exists(nonce);
        _require_tx_valid(nonce);
        _require_not_executed(nonce);
        _require_confirmed(nonce);

        // TODO: write a single field instead of the whole transaction?
        let mut transaction = _transactions::read(nonce);
        transaction.confirmations -= 1_usize;
        _transactions::write(nonce, transaction);

        let caller = get_caller_address();
        _is_confirmed::write((nonce, caller), false);

        ConfirmationRevoked(caller, nonce);
    }

    /// Executes a transaction if it has received enough confirmations. Can be called by anyone.
    /// # Arguments
    /// * `nonce` - Nonce for the transaction to execute
    /// # Returns
    /// * `Array<felt252>` - Possible transaction return data
    #[external]
    fn execute_transaction(nonce: u128) -> Array<felt252> {
        _require_tx_exists(nonce);
        _require_tx_valid(nonce);
        _require_not_executed(nonce);

        let mut transaction = _transactions::read(nonce);

        let threshold = _threshold::read();
        assert(threshold <= transaction.confirmations, 'more confirmations required');

        let mut function_calldata = ArrayTrait::new();
        let calldata_len = transaction.calldata_len;

        _get_transaction_calldata(nonce, calldata_len, ref function_calldata);

        transaction.executed = true;
        _transactions::write(nonce, transaction);

        let caller = get_caller_address();
        TransactionExecuted(caller, nonce);

        let response = call_contract_syscall(
            transaction.to, transaction.function_selector, function_calldata.span()
        ).unwrap_syscall();

        // TODO: this shouldn't be necessary. call_contract_syscall returns a Span<felt252>, which
        // is a serialized result, but returning a Span<felt252> results in an error:
        //
        // Trait has no implementation in context: core::serde::Serde::<core::array::Span::<core::felt252>>
        //
        // Cairo docs also have an example that returns a Span<felt252>:
        // https://github.com/starkware-libs/cairo/blob/fe425d0893ff93a936bb3e8bbbac771033074bdb/docs/reference/src/components/cairo/modules/language_constructs/pages/contracts.adoc#L226
        ArrayTCloneImpl::clone(response.snapshot)
    }

    /// Change the multisig threshold. Can only be called by the multisig itself, so the action needs to be confirmed by signers
    /// # Arguments
    /// * `threshold` - New threshold to set
    #[external]
    fn set_threshold(threshold: usize) {
        _require_multisig();

        let signers_len = _signers_len::read();
        _require_valid_threshold(threshold, signers_len);

        _set_threshold(threshold);
    }

    /// Change the multisig signers. If the number of signers is below the current threshold, it is lowered automatically.
    /// Can only be called by the multisig itself, so the action needs to be confirmed by signers
    /// # Arguments
    /// * `signers` - Array of the new signers. This is not additive: all of the needed signers need to be in this list
    #[external]
    fn set_signers(signers: Array<ContractAddress>) {
        _require_multisig();

        let signers_len = signers.len();
        _set_signers(signers, signers_len);

        let threshold = _threshold::read();

        // If less signers than threshold, lower the threshold automatically
        if signers_len < threshold {
            _require_valid_threshold(signers_len, signers_len);
            _set_threshold(signers_len);
        }
    }

    /// Sets new signers and new threshold simultaneously.
    /// Can only be called by the multisig itself, so the action needs to be confirmed by signers
    /// # Arguments
    /// * `signers` - Array of the new signers. This is not additive: all of the needed signers need to be in this list
    /// * `threshold` - New threshold to set
    #[external]
    fn set_signers_and_threshold(signers: Array<ContractAddress>, threshold: usize) {
        _require_multisig();

        let signers_len = signers.len();
        _require_valid_threshold(threshold, signers_len);

        _set_signers(signers, signers_len);
        _set_threshold(threshold);
    }

    /// Internals

    /// Stores signers to storage
    /// # Arguments
    /// * `signers` - Signers to store
    /// * `signers_len` - Length of the signers array. TODO: refactor this out
    fn _set_signers(signers: Array<ContractAddress>, signers_len: usize) {
        _require_unique_signers(@signers);

        let old_signers_len = _signers_len::read();

        // Clean the list of signers
        let mut i : usize = 0;
        loop {
            
            if (i == old_signers_len) {
                break ();
            }
            _is_signer::write(_signers::read(i), false);
            _signers::write(i, Zeroable::zero());
            i = i + 1_usize;
        };

        let tx_valid_since = _next_nonce::read();
        _tx_valid_since::write(tx_valid_since);

        _signers_len::write(signers_len);

        // Write new signers
        let signersSnapshot = @signers;
        let mut i : usize = 0;
        loop {
            
            if (i == signers_len) {
                break ();
            }
            let signer = *signersSnapshot.at(i);
            _signers::write(i, signer);
            _is_signer::write(signer, true);
            i = i + 1_usize;
        };

        SignersSet(signers);
    }

    /// Retrieves transaction calldata from storage
    /// # Arguments
    /// * `nonce` - Nonce for the transaction
    /// * `calldata_len` - Length of the transaction calldata. TODO: refactor out if possible
    /// * `function_calldata` - Where to store the data for returning it
    fn _get_transaction_calldata(
        nonce: u128, calldata_len: usize, ref function_calldata: Array<felt252>
    ) {
        let mut i : usize = 0;
        loop {
            
            if (i == calldata_len) {
                break ();
            }
            function_calldata.append(_transaction_calldata::read((nonce, i)));
            i = i + 1_usize;
        };
    }

    /// Stores a threshold to storage
    /// # Arguments
    /// * `threshold` - The threshold to store
    fn _set_threshold(threshold: usize) {
        _threshold::write(threshold);
        ThresholdSet(threshold);
    }

    /// Reverts if the caller is not a signer
    fn _require_signer() {
        let caller = get_caller_address();
        let is_signer = _is_signer::read(caller);
        assert(is_signer, 'invalid signer');
    }

    /// Reverts if a transaction for the given nonce doesn't exist
    /// # Arguments
    /// * `nonce` - Nonce for the transaction
    fn _require_tx_exists(nonce: u128) {
        let next_nonce = _next_nonce::read();
        assert(nonce < next_nonce, 'transaction does not exist');
    }

    /// Reverts if a transaction for the given nonce has already been executed
    /// # Arguments
    /// * `nonce` - Nonce for the transaction
    fn _require_not_executed(nonce: u128) {
        let transaction = _transactions::read(nonce);
        assert(!transaction.executed, 'transaction already executed');
    }

    /// Reverts if the caller has already confirmed the transaction
    /// # Arguments
    /// * `nonce` - The transaction nonce
    fn _require_not_confirmed(nonce: u128) {
        let caller = get_caller_address();
        let is_confirmed = _is_confirmed::read((nonce, caller));
        assert(!is_confirmed, 'transaction already confirmed');
    }

    /// Reverts if the transaction hasn't been confirmed by the caller
    /// # Arguments
    /// * `nonce` - Nonce for the transaction
    fn _require_confirmed(nonce: u128) {
        let caller = get_caller_address();
        let is_confirmed = _is_confirmed::read((nonce, caller));
        assert(is_confirmed, 'transaction not confirmed');
    }

    /// Reverts if the array of signers has duplicates
    /// # Arguments
    /// * `signers` - The array of signers to check
    fn _require_unique_signers(signers: @Array<ContractAddress>) {
        assert_unique_values(signers);
    }

    /// Reverts if the transaction is not valid anymore (a transaction with a higher nonce has already been executed)
    /// # Arguments
    /// * `nonce` - Nonce for the transaction
    fn _require_tx_valid(nonce: u128) {
        let tx_valid_since = _tx_valid_since::read();
        assert(tx_valid_since <= nonce, 'transaction invalid');
    }

    /// Reverts if the caller is not this contract itself
    fn _require_multisig() {
        let caller = get_caller_address();
        let contract = get_contract_address();
        assert(caller == contract, 'only multisig allowed');
    }

    /// Reverts if the combination of threhold and signers length is not valid
    /// # Arguments
    /// * `threshold` - The given threshold
    /// * `signers_len` - The amount of signers
    fn _require_valid_threshold(threshold: usize, signers_len: usize) {
        if threshold == 0_usize {
            if signers_len == 0_usize {
                return ();
            }
        }

        assert(threshold >= 1_usize, 'invalid threshold, too small');
        assert(threshold <= signers_len, 'invalid threshold, too large');
    }

    /// Reverts if the given nonce is not the next available nonce
    /// # Arguments
    /// * `nonce` - Nonce to check
    fn _require_valid_nonce(nonce: u128) {
        let next_nonce = _next_nonce::read();
        assert(nonce == next_nonce, 'invalid nonce');
    }
}