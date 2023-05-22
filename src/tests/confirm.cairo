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
fn test_confirm_transaction() {
    let signer1 = contract_address_const::<1>();
    let signer2 = contract_address_const::<2>();
    let mut signers = ArrayTrait::new();
    signers.append(signer1);
    signers.append(signer2);
    Multisig::constructor(:signers, threshold: 2);

    set_caller_address(signer1);
    Multisig::submit_transaction(
        to: contract_address_const::<42>(),
        function_selector: 10,
        calldata: sample_calldata(),
        nonce: 0
    );
    Multisig::confirm_transaction(nonce: 0);

    assert(Multisig::is_confirmed(nonce: 0, signer: signer1), 'should be confirmed');
    assert(!Multisig::is_confirmed(nonce: 0, signer: signer2), 'should not be confirmed');
    let (transaction, _) = Multisig::get_transaction(0);
    assert(transaction.confirmations == 1, 'should have confirmation');
}

#[test]
#[available_gas(2000000)]
#[should_panic]
fn test_confirm_transaction_not_signer() {
    let signer = contract_address_const::<1>();
    let not_signer = contract_address_const::<2>();
    let mut signers = ArrayTrait::new();
    signers.append(signer);
    Multisig::constructor(:signers, threshold: 1);
    set_caller_address(signer);
    Multisig::submit_transaction(
        to: contract_address_const::<42>(),
        function_selector: 10,
        calldata: sample_calldata(),
        nonce: 0
    );

    set_caller_address(not_signer);
    Multisig::confirm_transaction(nonce: 0);
}