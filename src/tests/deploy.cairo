use starsign::multisig::assert_unique_values;
use starsign::multisig::Multisig;
use starsign::multisig::IMultisigDispatcher;
use starsign::multisig::IMultisigDispatcherTrait;

use starknet::contract_address_const;
use starknet::testing::set_caller_address;
use starknet::class_hash::class_hash_const;
use starknet::syscalls::deploy_syscall;
use starknet::class_hash::Felt252TryIntoClassHash;
use starknet::ContractAddress;
use starknet::SyscallResult;

use serde::Serde;
use array::ArrayTrait;
use traits::Into;
use traits::TryInto;
use option::OptionTrait;
use result::ResultTrait;

use debug::PrintTrait;

fn get_multisig() -> (IMultisigDispatcher, ContractAddress) {
    let signer1 = contract_address_const::<10>();    

    let mut signers = ArrayTrait::<felt252>::new();
    let mut calldata = ArrayTrait::<felt252>::new(); 

    signers.append(signer1.into());
    signers.serialize(ref calldata);

    calldata.append(1_felt252); // threshold

    let (addr, _)  = deploy_syscall(Multisig::TEST_CLASS_HASH.try_into().unwrap(), 0, calldata.span(), false).unwrap();

    (IMultisigDispatcher{ contract_address: addr }, signer1)
}

#[test]
#[available_gas(2000000)]
fn test_correct_signer_data_upon_deployment() {
    let user2 = contract_address_const::<11>();

    let (multisig, signer1) = get_multisig();

    let signers = multisig.get_signers();

    assert(multisig.get_signers_len() == 1_usize, 'Wrong signer count');

    assert(multisig.is_signer(signer1), 'Not signer');
    assert(!multisig.is_signer(user2), 'Shouldn\'t be a signer');
    assert(!multisig.is_signer(multisig.contract_address), 'Shouldn\'t be a signer');  

    assert(signers.len() == 1, 'Wrong amount of signers');
    assert(*signers.at(0) == signer1, 'Wrong signer');
}

#[test]
#[available_gas(2000000)]
fn test_correct_threshold_data_upon_deployment() {
    let (multisig, _) = get_multisig();

    assert(multisig.get_threshold() == 1_usize, 'Wrong threshold');
}

#[test]
#[available_gas(2000000)]
fn test_correct_transactions_data_upon_deployment() {
    let (multisig, _) = get_multisig();

    assert(multisig.get_transactions_len() == 0_u128, 'Wrong tx count');
}

#[test]
#[available_gas(2000000)]
fn test_unique_deployment_addresses() {
    let (multisig1, _) = get_multisig();
    let (multisig2, _) = get_multisig();

    assert(multisig1.contract_address != multisig2.contract_address, 'Non-unique addresses');
}

#[test]
#[available_gas(2000000)]
fn test_deploy_with_too_large_threshold_fails() {
    let signer1 = contract_address_const::<10>();    

    let mut signers = ArrayTrait::<felt252>::new();
    let mut calldata = ArrayTrait::<felt252>::new(); 

    signers.append(signer1.into());
    signers.serialize(ref calldata);

    calldata.append(3_felt252); // threshold

    let mut err = deploy_syscall(Multisig::TEST_CLASS_HASH.try_into().unwrap(), 0, calldata.span(), false).unwrap_err();
    assert(err.pop_front().unwrap() == 'invalid threshold, too large', 'threshold should be too large');
}

#[test]
#[available_gas(2000000)]
fn test_deploy_with_too_small_threshold_fails() {
    let signer1 = contract_address_const::<10>();    

    let mut signers = ArrayTrait::<felt252>::new();
    let mut calldata = ArrayTrait::<felt252>::new(); 

    signers.append(signer1.into());
    signers.serialize(ref calldata);

    calldata.append(0_felt252); // threshold

    let mut err = deploy_syscall(Multisig::TEST_CLASS_HASH.try_into().unwrap(), 0, calldata.span(), false).unwrap_err();
    assert(err.pop_front().unwrap() == 'invalid threshold, too small', 'threshold should be too small');
}

#[test]
#[available_gas(2000000)]
fn test_deploy_with_zero_signers_fails() {
    let mut signers = ArrayTrait::<felt252>::new();
    let mut calldata = ArrayTrait::<felt252>::new(); 

    signers.serialize(ref calldata);

    calldata.append(1_felt252); // threshold

    let mut err = deploy_syscall(Multisig::TEST_CLASS_HASH.try_into().unwrap(), 0, calldata.span(), false).unwrap_err();
    assert(err.pop_front().unwrap() == 'invalid threshold, too large', 'threshold should be too small');
}