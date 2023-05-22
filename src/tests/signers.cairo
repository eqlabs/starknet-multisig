use starsign::multisig::Multisig;

use starknet::contract_address_const;
use array::ArrayTrait;

#[test]
#[available_gas(2000000)]
fn test_is_signer_true() {
    let signer = contract_address_const::<1>();
    let mut signers = ArrayTrait::new();
    signers.append(signer);
    Multisig::constructor(:signers, threshold: 1);
    assert(Multisig::is_signer(signer), 'should be signer');
}

#[test]
#[available_gas(2000000)]
fn test_is_signer_false() {
    let not_signer = contract_address_const::<2>();
    let mut signers = ArrayTrait::new();
    signers.append(contract_address_const::<1>());
    Multisig::constructor(:signers, threshold: 1);
    assert(!Multisig::is_signer(not_signer), 'should be signer');
}

#[test]
#[available_gas(2000000)]
fn test_signer_len() {
    let mut signers = ArrayTrait::new();
    signers.append(contract_address_const::<1>());
    signers.append(contract_address_const::<2>());
    Multisig::constructor(:signers, threshold: 1);
    assert(Multisig::get_signers_len() == 2, 'should equal 2 signers');
}

#[test]
#[available_gas(2000000)]
fn test_get_signers() {
    let signer1 = contract_address_const::<1>();
    let signer2 = contract_address_const::<2>();
    let mut signers = ArrayTrait::new();
    signers.append(signer1);
    signers.append(signer2);

    Multisig::constructor(:signers, threshold: 1);
    let returned_signers = Multisig::get_signers();
    assert(returned_signers.len() == 2, 'should match signers length');
    assert(*returned_signers.at(0) == signer1, 'should match signer 1');
    assert(*returned_signers.at(1) == signer2, 'should match signer 2');
}

#[test]
#[available_gas(2000000)]
fn test_get_threshold() {
    let mut signers = ArrayTrait::new();
    signers.append(contract_address_const::<1>());
    signers.append(contract_address_const::<2>());
    Multisig::constructor(:signers, threshold: 1);
    assert(Multisig::get_threshold() == 1, 'should equal threshold of 1');
}