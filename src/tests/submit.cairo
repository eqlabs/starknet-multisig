use starsign::multisig::Multisig;

use starknet::contract_address_const;
use starknet::testing::set_caller_address;
use array::ArrayTrait;

fn sample_calldata() -> Array::<felt252> {
    let mut calldata = ArrayTrait::new();
    calldata.append(1);
    calldata.append(2);
    calldata.append(3);
    calldata
}

#[test]
#[available_gas(2000000)]
fn test_submit_transaction() {
    let signer = contract_address_const::<1>();
    let mut signers = ArrayTrait::new();
    signers.append(signer);
    Multisig::constructor(:signers, threshold: 1);

    set_caller_address(signer);
    let to = contract_address_const::<42>();
    let function_selector = 10;
    Multisig::submit_transaction(:to, :function_selector, calldata: sample_calldata(), nonce: 0);

    let (transaction, calldata) = Multisig::get_transaction(0);
    assert(transaction.to == to, 'should match target address');
    assert(transaction.function_selector == function_selector, 'should match function selector');
    assert(transaction.calldata_len == sample_calldata().len(), 'should match calldata length');
    assert(!transaction.executed, 'should not be executed');
    assert(transaction.confirmations == 0, 'should not have confirmations');
// TODO: compare calldata when loops are supported
}

#[test]
#[available_gas(2000000)]
#[should_panic]
fn test_submit_transaction_not_signer() {
    let signer = contract_address_const::<1>();
    let mut signers = ArrayTrait::new();
    signers.append(signer);
    Multisig::constructor(:signers, threshold: 1);

    set_caller_address(contract_address_const::<3>());
    Multisig::submit_transaction(
        to: contract_address_const::<42>(),
        function_selector: 10,
        calldata: sample_calldata(),
        nonce: 0
    );
}

#[test]
#[available_gas(2000000)]
#[should_panic]
fn test_submit_transaction_invalid_nonce() {
    let signer = contract_address_const::<1>();
    let mut signers = ArrayTrait::new();
    signers.append(signer);
    Multisig::constructor(:signers, threshold: 1);

    set_caller_address(signer);
    Multisig::submit_transaction(
        to: contract_address_const::<42>(),
        function_selector: 10,
        calldata: sample_calldata(),
        nonce: 1
    );
}