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


fn assert_unique_values<T,
impl TCopy: Copy<T>,
impl TDrop: Drop<T>,
impl TPartialEq: PartialEq<T>,
>(
    arr: @Array::<T>
) {
    let len = arr.len();
    _assert_unique_values_loop(arr, len, 0_usize, 1_usize);
}

fn _assert_unique_values_loop<T,
impl TCopy: Copy<T>,
impl TDrop: Drop<T>,
impl TPartialEq: PartialEq<T>,
>(
    arr: @Array::<T>, len: usize, j: usize, k: usize
) {
    if j >= len {
        return ();
    }
    if k >= len {
        gas::withdraw_gas_all(get_builtin_costs()).expect('Out of gas');
        _assert_unique_values_loop(arr, len, j + 1_usize, j + 2_usize);
        return ();
    }

    assert(*arr.at(j) != *arr.at(k), 'duplicate values');
    
    gas::withdraw_gas_all(get_builtin_costs()).expect('Out of gas');
    _assert_unique_values_loop(arr, len, j, k + 1_usize);
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

    #[constructor]
    fn constructor(signers: Array<ContractAddress>, threshold: usize) {
        let signers_len = signers.len();
        _require_valid_threshold(threshold, signers_len);
        _set_signers(signers, signers_len);
        _set_threshold(threshold);
    }

    /// Views

    #[view]
    fn is_signer(address: ContractAddress) -> bool {
        _is_signer::read(address)
    }

    #[view]
    fn get_signers_len() -> usize {
        _signers_len::read()
    }

    #[view]
    fn get_signers() -> Array<ContractAddress> {
        let signers_len = _signers_len::read();
        let mut signers = ArrayTrait::new();
        _get_signers_range(0_usize, signers_len, ref signers);
        signers
    }

    #[view]
    fn get_threshold() -> usize {
        _threshold::read()
    }

    #[view]
    fn get_transactions_len() -> u128 {
        _next_nonce::read()
    }

    #[view]
    fn is_confirmed(nonce: u128, signer: ContractAddress) -> bool {
        _is_confirmed::read((nonce, signer))
    }

    #[view]
    fn is_executed(nonce: u128) -> bool {
        let transaction = _transactions::read(nonce);
        transaction.executed
    }

    #[view]
    fn get_transaction(nonce: u128) -> (Transaction, Array::<felt252>) {
        let transaction = _transactions::read(nonce);

        let mut function_calldata = ArrayTrait::new();
        let calldata_len = transaction.calldata_len;
        _get_transaction_calldata_range(nonce, 0_usize, calldata_len, ref function_calldata);

        (transaction, function_calldata)
    }

    #[view]
    fn type_and_version() -> felt252 {
        'Multisig 1.0.0'
    }

    /// Externals

    // #[external]
    // fn upgrade(new_impl: ClassHash) {
    //     _require_multisig();
    //     Upgradeable::upgrade(new_impl)
    // }

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

        _set_transaction_calldata_range(nonce, 0_usize, calldata_len, @function_calldata);

        let caller = get_caller_address();
        TransactionSubmitted(caller, nonce, to);
        _next_nonce::write(nonce + 1_u128);
    }

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

        _get_transaction_calldata_range(nonce, 0_usize, calldata_len, ref function_calldata);

        transaction.executed = true;
        _transactions::write(nonce, transaction);

        let caller = get_caller_address();
        TransactionExecuted(caller, nonce);

        let mut calldata_span = function_calldata.span();
        let deserializedCalldata = serde::ArraySerde::<felt252>::deserialize(ref calldata_span).unwrap();

        let response = call_contract_syscall(
            transaction.to, transaction.function_selector, deserializedCalldata.span()
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

    #[external]
    fn set_threshold(threshold: usize) {
        _require_multisig();

        let signers_len = _signers_len::read();
        _require_valid_threshold(threshold, signers_len);

        _set_threshold(threshold);
    }

    #[external]
    fn set_signers(signers: Array<ContractAddress>) {
        _require_multisig();

        let signers_len = signers.len();
        _set_signers(signers, signers_len);

        let threshold = _threshold::read();

        if signers_len < threshold {
            _require_valid_threshold(signers_len, signers_len);
            _set_threshold(signers_len);
        }
    }

    #[external]
    fn set_signers_and_threshold(signers: Array<ContractAddress>, threshold: usize) {
        _require_multisig();

        let signers_len = signers.len();
        _require_valid_threshold(threshold, signers_len);

        _set_signers(signers, signers_len);
        _set_threshold(threshold);
    }

    /// Internals
    fn _set_signers(signers: Array<ContractAddress>, signers_len: usize) {
        _require_unique_signers(@signers);

        let old_signers_len = _signers_len::read();
        _clean_signers_range(0_usize, old_signers_len);

        let tx_valid_since = _next_nonce::read();
        _tx_valid_since::write(tx_valid_since);

        _signers_len::write(signers_len);
        _set_signers_range(0_usize, signers_len, @signers);

        SignersSet(signers);
    }

    fn _clean_signers_range(index: usize, len: usize) {
        if index >= len {
            return ();
        }

        let signer = _signers::read(index);
        _is_signer::write(signer, false);
        _signers::write(index, Zeroable::zero());

        gas::withdraw_gas_all(get_builtin_costs()).expect('Out of gas');
        _clean_signers_range(index + 1_usize, len);
    }

    fn _set_signers_range(index: usize, len: usize, signers: @Array<ContractAddress>) {
        if index >= len {
            return ();
        }

        let signer = *signers.at(index);
        _signers::write(index, signer);
        _is_signer::write(signer, true);

        gas::withdraw_gas_all(get_builtin_costs()).expect('Out of gas');
        _set_signers_range(index + 1_usize, len, signers);
    }

    fn _get_signers_range(index: usize, len: usize, ref signers: Array<ContractAddress>) {
        if index >= len {
            return ();
        }

        let signer = _signers::read(index);
        signers.append(signer);

        gas::withdraw_gas_all(get_builtin_costs()).expect('Out of gas');
        _get_signers_range(index + 1_usize, len, ref signers);
    }

    fn _set_transaction_calldata_range(
        nonce: u128, index: usize, len: usize, function_calldata: @Array<felt252>
    ) {
        if index >= len {
            return ();
        }

        let calldata_arg = *function_calldata.at(index);
        _transaction_calldata::write((nonce, index), calldata_arg);

        gas::withdraw_gas_all(get_builtin_costs()).expect('Out of gas');
        _set_transaction_calldata_range(nonce, index + 1_usize, len, function_calldata);
    }

    fn _get_transaction_calldata_range(
        nonce: u128, index: usize, len: usize, ref function_calldata: Array<felt252>
    ) {
        if index >= len {
            return ();
        }

        let calldata_arg = _transaction_calldata::read((nonce, index));
        
        function_calldata.append(calldata_arg);

        gas::withdraw_gas_all(get_builtin_costs()).expect('Out of gas');
        _get_transaction_calldata_range(nonce, index + 1_usize, len, ref function_calldata);
    }

    fn _set_threshold(threshold: usize) {
        _threshold::write(threshold);
        ThresholdSet(threshold);
    }

    fn _require_signer() {
        let caller = get_caller_address();
        let is_signer = _is_signer::read(caller);
        assert(is_signer, 'invalid signer');
    }

    fn _require_tx_exists(nonce: u128) {
        let next_nonce = _next_nonce::read();
        assert(nonce < next_nonce, 'transaction does not exist');
    }

    fn _require_not_executed(nonce: u128) {
        let transaction = _transactions::read(nonce);
        assert(!transaction.executed, 'transaction already executed');
    }

    fn _require_not_confirmed(nonce: u128) {
        let caller = get_caller_address();
        let is_confirmed = _is_confirmed::read((nonce, caller));
        assert(!is_confirmed, 'transaction already confirmed');
    }

    fn _require_confirmed(nonce: u128) {
        let caller = get_caller_address();
        let is_confirmed = _is_confirmed::read((nonce, caller));
        assert(is_confirmed, 'transaction not confirmed');
    }

    fn _require_unique_signers(signers: @Array<ContractAddress>) {
        assert_unique_values(signers);
    }

    fn _require_tx_valid(nonce: u128) {
        let tx_valid_since = _tx_valid_since::read();
        assert(tx_valid_since <= nonce, 'transaction invalid');
    }

    fn _require_multisig() {
        let caller = get_caller_address();
        let contract = get_contract_address();
        assert(caller == contract, 'only multisig allowed');
    }

    fn _require_valid_threshold(threshold: usize, signers_len: usize) {
        if threshold == 0_usize {
            if signers_len == 0_usize {
                return ();
            }
        }

        assert(threshold >= 1_usize, 'invalid threshold, too small');
        assert(threshold <= signers_len, 'invalid threshold, too large');
    }

    fn _require_valid_nonce(nonce: u128) {
        let next_nonce = _next_nonce::read();
        assert(nonce == next_nonce, 'invalid nonce');
    }
}