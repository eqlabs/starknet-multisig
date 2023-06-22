use starsign::multisig::Multisig;
use starsign::multisig::IMultisigDispatcher;
use starsign::multisig::IMultisigDispatcherTrait;
use starsign::target::Target;
use starsign::target::ITargetDispatcher;
use starsign::target::ITargetDispatcherTrait;

use starknet::syscalls::deploy_syscall;
use starknet::ContractAddress;
use starknet::contract_address_const;
use starknet::testing::set_caller_address;
use starknet::testing::set_contract_address;
use starknet::class_hash::Felt252TryIntoClassHash;
use starknet::get_caller_address;
use starknet::call_contract_syscall;

use traits::Into;
use traits::TryInto;
use serde::Serde;
use array::ArrayTrait;
use array::SpanTrait;
use option::OptionTrait;
use result::ResultTrait;

use debug::PrintTrait;

// Calculated with https://www.stark-utils.xyz/converter
const FUNCTION_SELECTOR : felt252 = 1530486729947006463063166157847785599120665941190480211966374137237989315360; // increase_balance     

fn get_multisig() -> (IMultisigDispatcher, ITargetDispatcher, ContractAddress, ContractAddress) {
    let signer1 = contract_address_const::<10>();    
    let signer2 = contract_address_const::<11>();    

    let mut signers = ArrayTrait::<felt252>::new();
    let mut calldata = ArrayTrait::<felt252>::new(); 

    signers.append(signer1.into());
    signers.append(signer2.into());
    signers.serialize(ref calldata);

    calldata.append(1_felt252); // threshold

    let (targetAddr, _) = deploy_syscall(Target::TEST_CLASS_HASH.try_into().unwrap(), 0, calldata.span(), false).unwrap();
    let (multisigAddr, _)  = deploy_syscall(Multisig::TEST_CLASS_HASH.try_into().unwrap(), 0, calldata.span(), false).unwrap();

    (IMultisigDispatcher{ contract_address: multisigAddr }, ITargetDispatcher{ contract_address: targetAddr }, signer1, signer2)
}

#[test]
#[available_gas(20000000)]
fn test_set_and_get_signers_work() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    let signer3 = contract_address_const::<12>();  

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(signer1.into());
    calldata.append(signer2.into());
    calldata.append(signer3.into());

    let mut serializedCalldata = ArrayTrait::<felt252>::new();
    calldata.serialize(ref serializedCalldata);

    let selector : felt252 = 667654066930288457060622961440209991290119613176827951904429854971730312982; // set_signers     

    multisig.submit_transaction(to: multisig.contract_address, function_selector: selector, function_calldata: serializedCalldata, nonce: 0);
    multisig.confirm_transaction(0_u128);
    multisig.execute_transaction(0_u128);

    let gotSigners = multisig.get_signers();
    
    assert(gotSigners.len() == 3, 'Wrong amount of signers');
    assert(*gotSigners.at(0) == signer1.into(), 'incorrect signer 1');
    assert(*gotSigners.at(1) == signer2.into(), 'incorrect signer 2');
    assert(*gotSigners.at(2) == signer3.into(), 'incorrect signer 3');
}

#[test]
#[available_gas(20000000)]
fn test_set_and_get_threshold_work() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(2);

    let selector : felt252 = 962535268459140951769475154287133092202355889801909274932848779988249076997; // set_threshold     

    multisig.submit_transaction(to: multisig.contract_address, function_selector: selector, function_calldata: calldata, nonce: 0);
    multisig.confirm_transaction(0_u128);
    multisig.execute_transaction(0_u128);
    
    assert(multisig.get_threshold() == 2, 'Wrong threshold');
}

#[test]
#[available_gas(20000000)]
fn test_set_signers_lowers_threshold() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    // Increase threshold (so it can be lowered later)
    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(2);

    let selector : felt252 = 962535268459140951769475154287133092202355889801909274932848779988249076997; // set_threshold  
    multisig.submit_transaction(to: multisig.contract_address, function_selector: selector, function_calldata: calldata, nonce: 0);


    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(signer1.into());

    let mut serializedCalldata = ArrayTrait::<felt252>::new();
    calldata.serialize(ref serializedCalldata);

    let selector : felt252 = 667654066930288457060622961440209991290119613176827951904429854971730312982; // set_signers     

    multisig.submit_transaction(to: multisig.contract_address, function_selector: selector, function_calldata: serializedCalldata, nonce: 1);
    multisig.confirm_transaction(1_u128);
    multisig.execute_transaction(1_u128);

    let gotSigners = multisig.get_signers();
    
    assert(gotSigners.len() == 1, 'Wrong amount of signers');
    assert(*gotSigners.at(0) == signer1.into(), 'incorrect signer 1');
    assert(multisig.get_threshold() == 1, 'Wrong threshold');
}

#[test]
#[available_gas(20000000)]
fn test_set_signers_lowers_threshold_to_zero() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    // Increase threshold (so it can be lowered later)
    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(2);

    let selector : felt252 = 962535268459140951769475154287133092202355889801909274932848779988249076997; // set_threshold  
    multisig.submit_transaction(to: multisig.contract_address, function_selector: selector, function_calldata: calldata, nonce: 0);

    let mut calldata = ArrayTrait::<felt252>::new();

    let mut serializedCalldata = ArrayTrait::<felt252>::new();
    calldata.serialize(ref serializedCalldata);

    let selector : felt252 = 667654066930288457060622961440209991290119613176827951904429854971730312982; // set_signers     

    multisig.submit_transaction(to: multisig.contract_address, function_selector: selector, function_calldata: serializedCalldata, nonce: 1);
    multisig.confirm_transaction(1_u128);
    multisig.execute_transaction(1_u128);

    let gotSigners = multisig.get_signers();
    
    assert(gotSigners.len() == 0, 'Wrong amount of signers');
    assert(multisig.get_threshold() == 0, 'Wrong threshold');
}

#[test]
#[available_gas(20000000)]
fn test_set_signers_and_threshold_works() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    let signer3 = contract_address_const::<12>();  

    let mut calldataSigners = ArrayTrait::<ContractAddress>::new();
    calldataSigners.append(signer1);
    calldataSigners.append(signer2);
    calldataSigners.append(signer3);

    let mut serializedCalldata = ArrayTrait::<felt252>::new();
    calldataSigners.serialize(ref serializedCalldata);

    serializedCalldata.append(3); // threshold

    let selector : felt252 = 1012059877257749271008922442087061904580459285575506147692280805498605514473; // set_signers_and_threshold     

    multisig.submit_transaction(to: multisig.contract_address, function_selector: selector, function_calldata: serializedCalldata, nonce: 0);
    multisig.confirm_transaction(0_u128);
    multisig.execute_transaction(0_u128);

    let gotSigners = multisig.get_signers();
    
    assert(multisig.get_threshold() == 3, 'Wrong threshold');

    assert(gotSigners.len() == 3, 'Wrong amount of signers');
    assert(*gotSigners.at(0) == signer1.into(), 'incorrect signer 1');
    assert(*gotSigners.at(1) == signer2.into(), 'incorrect signer 2');
    assert(*gotSigners.at(2) == signer3.into(), 'incorrect signer 3');
}

#[test]
#[available_gas(20000000)]
#[should_panic(expected: ('transaction invalid','ENTRYPOINT_FAILED'))]
fn test_set_signers_invalidates_previous_txs() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(12_felt252);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata, nonce: 0);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(signer1.into());

    let mut serializedCalldata = ArrayTrait::<felt252>::new();
    calldata.serialize(ref serializedCalldata);

    let selector : felt252 = 667654066930288457060622961440209991290119613176827951904429854971730312982; // set_signers     

    multisig.submit_transaction(to: multisig.contract_address, function_selector: selector, function_calldata: serializedCalldata, nonce: 1);
    multisig.confirm_transaction(1_u128);
    multisig.execute_transaction(1_u128);

    multisig.confirm_transaction(0_u128);
}

#[test]
#[available_gas(20000000)]
#[should_panic(expected: ('duplicate values','ENTRYPOINT_FAILED','ENTRYPOINT_FAILED'))]
fn test_set_non_unique_signers_fails() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    let signer3 = contract_address_const::<12>();  

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(signer1.into());
    calldata.append(signer2.into());
    calldata.append(signer1.into());

    let mut serializedCalldata = ArrayTrait::<felt252>::new();
    calldata.serialize(ref serializedCalldata);

    let selector : felt252 = 667654066930288457060622961440209991290119613176827951904429854971730312982; // set_signers     

    multisig.submit_transaction(to: multisig.contract_address, function_selector: selector, function_calldata: serializedCalldata, nonce: 0);
    multisig.confirm_transaction(0_u128);
    multisig.execute_transaction(0_u128);
}

#[test]
#[available_gas(20000000)]
#[should_panic(expected: ('only multisig allowed','ENTRYPOINT_FAILED'))]
fn test_set_signers_directly_fails() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<ContractAddress>::new();
    calldata.append(signer1);
    calldata.append(signer2);

    multisig.set_signers(calldata);
}

#[test]
#[available_gas(20000000)]
#[should_panic(expected: ('only multisig allowed','ENTRYPOINT_FAILED'))]
fn test_set_threshold_directly_fails() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    multisig.set_threshold(1);
}

#[test]
#[available_gas(20000000)]
#[should_panic(expected: ('only multisig allowed','ENTRYPOINT_FAILED'))]
fn test_set_signers_and_threshold_directly_fails() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    let signer3 = contract_address_const::<12>();  

    let mut calldataSigners = ArrayTrait::<ContractAddress>::new();
    calldataSigners.append(signer1);
    calldataSigners.append(signer2);
    calldataSigners.append(signer3);

    multisig.set_signers_and_threshold(calldataSigners, 3);
}

#[test]
#[available_gas(20000000)]
#[should_panic(expected: ('invalid threshold, too large','ENTRYPOINT_FAILED','ENTRYPOINT_FAILED'))]
fn test_set_threshold_fails_for_too_large_threshold() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(5);

    let selector : felt252 = 962535268459140951769475154287133092202355889801909274932848779988249076997; // set_threshold     

    multisig.submit_transaction(to: multisig.contract_address, function_selector: selector, function_calldata: calldata, nonce: 0);
    multisig.confirm_transaction(0_u128);
    multisig.execute_transaction(0_u128);
}

#[test]
#[available_gas(20000000)]
#[should_panic(expected: ('invalid threshold, too small','ENTRYPOINT_FAILED','ENTRYPOINT_FAILED'))]
fn test_set_threshold_fails_for_too_small_threshold() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(0);

    let selector : felt252 = 962535268459140951769475154287133092202355889801909274932848779988249076997; // set_threshold     

    multisig.submit_transaction(to: multisig.contract_address, function_selector: selector, function_calldata: calldata, nonce: 0);
    multisig.confirm_transaction(0_u128);
    multisig.execute_transaction(0_u128);
}