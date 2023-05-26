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

use integer::u32_try_from_felt252;

use traits::Into;
use traits::TryInto;
use serde::Serde;
use array::ArrayTrait;
use option::OptionTrait;
use result::ResultTrait;

use debug::PrintTrait;

// Calculated with https://www.stark-utils.xyz/converter
const FUNCTION_SELECTOR : felt252 = 1530486729947006463063166157847785599120665941190480211966374137237989315360; // increase_balance     
const FUNCTION_SELECTOR_SET_SIGNERS : felt252 = 667654066930288457060622961440209991290119613176827951904429854971730312982; // set_signers

fn get_multisig() -> (IMultisigDispatcher, ITargetDispatcher, ContractAddress) {
    let signer1 = contract_address_const::<10>();    

    let mut signers = ArrayTrait::<felt252>::new();
    let mut calldata = ArrayTrait::<felt252>::new(); 

    signers.append(signer1.into());
    signers.serialize(ref calldata);

    calldata.append(1_felt252); // threshold

    let (targetAddr, _) = deploy_syscall(Target::TEST_CLASS_HASH.try_into().unwrap(), 0, calldata.span(), false).unwrap();
    let (multisigAddr, _)  = deploy_syscall(Multisig::TEST_CLASS_HASH.try_into().unwrap(), 0, calldata.span(), false).unwrap();

    (IMultisigDispatcher{ contract_address: multisigAddr }, ITargetDispatcher{ contract_address: targetAddr }, signer1)
}

fn getnum(num: felt252) -> u32 {
    u32_try_from_felt252(num).unwrap()
}

fn getCalldata(increase : felt252) -> Array<felt252> {
    let mut calldata = ArrayTrait::<felt252>::new(); 
    calldata.append(increase);

    let mut serializedCalldata = ArrayTrait::<felt252>::new(); 
    calldata.serialize(ref serializedCalldata);
    serializedCalldata
}

#[test]
#[available_gas(20000000)]
fn test_execute_transaction() {
    let (multisig, target, signer1) = get_multisig();
    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(12_felt252);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata, nonce: 0);

    let oldBalance = target.get_balance();    

    multisig.confirm_transaction(0_u128);
    multisig.execute_transaction(0_u128);

    let newBalance = target.get_balance();

    assert(getnum(oldBalance) + getnum(12_felt252) == getnum(newBalance), 'invalid result');
}

#[test]
#[available_gas(20000000)]
fn test_execute_transaction_by_nonsigner() {
    let (multisig, target, signer1) = get_multisig();
    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(12_felt252);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata, nonce: 0);

    let oldBalance = target.get_balance();    

    multisig.confirm_transaction(0_u128);

    set_contract_address(contract_address_const::<20>());

    multisig.execute_transaction(0_u128);

    let newBalance = target.get_balance();

    assert(getnum(oldBalance) + getnum(12_felt252) == getnum(newBalance), 'invalid result');
}

#[test]
#[available_gas(20000000)]
fn test_execute_transaction_for_subsequent_transactions() {
    let (multisig, target, signer1) = get_multisig();

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(12_felt252);

    set_contract_address(signer1);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata, nonce: 0);

    let startBalance = target.get_balance();    

    multisig.confirm_transaction(0_u128);
    multisig.execute_transaction(0_u128);

    let middleBalance = target.get_balance();

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(13_felt252);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata, nonce: 1);

    multisig.confirm_transaction(1_u128);
    multisig.execute_transaction(1_u128);

    let endBalance = target.get_balance();  

    assert(getnum(startBalance) + getnum(12_felt252) == getnum(middleBalance), 'invalid first result');
    assert(getnum(middleBalance) + getnum(13_felt252) == getnum(endBalance), 'invalid second result');
}

#[test]
#[available_gas(20000000)]
fn test_execute__and_confirm_in_arbitrary_order() {
    // - submit all transactions
    // - confirm tx 2 and tx 0
    // - execute tx 2
    // - confirm tx 1
    // - execute tx 0
    // - execute tx 1

    let (multisig, target, signer1) = get_multisig();
    set_contract_address(signer1);

    let mut calldata0 = ArrayTrait::<felt252>::new();
    calldata0.append(12_felt252);

    let mut calldata1 = ArrayTrait::<felt252>::new();
    calldata1.append(13_felt252);

    let mut calldata2 = ArrayTrait::<felt252>::new();
    calldata2.append(14_felt252);   

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata0, nonce: 0);
    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata1, nonce: 1);
    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata2, nonce: 2);     

    multisig.confirm_transaction(2_u128);
    multisig.confirm_transaction(0_u128);

    let startBalance = target.get_balance();  
    
    multisig.execute_transaction(2_u128);
    let middleBalance1 = target.get_balance();  

    multisig.confirm_transaction(1_u128);
    multisig.execute_transaction(0_u128);
    let middleBalance2 = target.get_balance();

    multisig.execute_transaction(1_u128);

    let endBalance = target.get_balance();  

    assert(getnum(startBalance) + getnum(14_felt252) == getnum(middleBalance1), 'invalid first result');
    assert(getnum(middleBalance1) + getnum(12_felt252) == getnum(middleBalance2), 'invalid second result');
    assert(getnum(middleBalance2) + getnum(13_felt252) == getnum(endBalance), 'invalid third result');
}

#[test]
#[available_gas(20000000)]
fn test_execute_fails_without_signers() {
    let (multisig, target, signer1) = get_multisig();
    set_contract_address(signer1);

    let serializedCalldata0 = getCalldata(12_felt252);
    let serializedCalldata1 = getCalldata(13_felt252);
    let serializedCalldata2 = getCalldata(14_felt252);    

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: serializedCalldata0, nonce: 0);
    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: serializedCalldata1, nonce: 1);
    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: serializedCalldata2, nonce: 2);     

    let mut signers = ArrayTrait::<felt252>::new();
    let mut serializedSigners = ArrayTrait::<felt252>::new();

    signers.serialize(ref serializedSigners);

    multisig.submit_transaction(to: multisig.contract_address, function_selector: FUNCTION_SELECTOR_SET_SIGNERS, function_calldata: serializedSigners, nonce: 3);     

    multisig.confirm_transaction(3_u128);
    multisig.execute_transaction(3_u128);
    
    // TODO: asserts
}


#[test]
#[available_gas(20000000)]
#[should_panic]
fn test_execute_fails_too_few_confirmations() {
    let (multisig, target, signer1) = get_multisig();

    let serializedCalldata = getCalldata(12_felt252);

    set_contract_address(signer1);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: serializedCalldata, nonce: 0);

    multisig.execute_transaction(0_u128);
}

// TODO: rest of the tests