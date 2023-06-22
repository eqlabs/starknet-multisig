use starsign::multisig::Multisig;
use starsign::multisig::IMultisigDispatcher;
use starsign::multisig::IMultisigDispatcherTrait;
use starsign::target::Target;
use starsign::target::ITargetDispatcher;
use starsign::target::ITargetDispatcherTrait;
use starsign::target::Something;

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
use array::SpanTrait;
use option::OptionTrait;
use result::ResultTrait;

use debug::PrintTrait;

// Calculated with https://www.stark-utils.xyz/converter
const FUNCTION_SELECTOR : felt252 = 1530486729947006463063166157847785599120665941190480211966374137237989315360; // increase_balance     

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

fn get_multisig_multiple_signers() -> (IMultisigDispatcher, ITargetDispatcher, ContractAddress, ContractAddress, ContractAddress) {
    let signer1 = contract_address_const::<10>();    
    let signer2 = contract_address_const::<11>();    
    let signer3 = contract_address_const::<12>();    

    let mut signers = ArrayTrait::<felt252>::new();
    let mut calldata = ArrayTrait::<felt252>::new(); 

    signers.append(signer1.into());
    signers.append(signer2.into());
    signers.append(signer3.into());
    signers.serialize(ref calldata);

    calldata.append(2_felt252); // threshold

    let (targetAddr, _) = deploy_syscall(Target::TEST_CLASS_HASH.try_into().unwrap(), 0, calldata.span(), false).unwrap();
    let (multisigAddr, _)  = deploy_syscall(Multisig::TEST_CLASS_HASH.try_into().unwrap(), 0, calldata.span(), false).unwrap();

    (IMultisigDispatcher{ contract_address: multisigAddr }, ITargetDispatcher{ contract_address: targetAddr }, signer1, signer2, signer3)
}

fn getnum(num: felt252) -> u32 {
    u32_try_from_felt252(num).unwrap()
}

#[test]
#[available_gas(20000000)]
fn test_works() {
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
fn test_works_with_multiple_signers() {
    let (multisig, target, signer1, signer2, signer3) = get_multisig_multiple_signers();

    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(12_felt252);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata, nonce: 0);

    let oldBalance = target.get_balance();    

    multisig.confirm_transaction(0_u128);
    set_contract_address(signer3);
    multisig.confirm_transaction(0_u128);

    multisig.execute_transaction(0_u128);

    let newBalance = target.get_balance();

    assert(getnum(oldBalance) + getnum(12_felt252) == getnum(newBalance), 'invalid result');
}

#[test]
#[available_gas(20000000)]
fn test_works_with_too_many_confirmations() {
    let (multisig, target, signer1, signer2, signer3) = get_multisig_multiple_signers();

    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(12_felt252);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata, nonce: 0);

    let oldBalance = target.get_balance();    

    multisig.confirm_transaction(0_u128);
    set_contract_address(signer3);
    multisig.confirm_transaction(0_u128);
    set_contract_address(signer2);
    multisig.confirm_transaction(0_u128);

    multisig.execute_transaction(0_u128);

    let newBalance = target.get_balance();

    assert(getnum(oldBalance) + getnum(12_felt252) == getnum(newBalance), 'invalid result');
}

#[test]
#[available_gas(20000000)]
fn test_works_if_superfluous_confirmer_revokes() {
    let (multisig, target, signer1, signer2, signer3) = get_multisig_multiple_signers();

    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(12_felt252);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata, nonce: 0);

    let oldBalance = target.get_balance();    

    multisig.confirm_transaction(0_u128);
    set_contract_address(signer3);
    multisig.confirm_transaction(0_u128);
    set_contract_address(signer2);
    multisig.confirm_transaction(0_u128);

    set_contract_address(signer1);
    multisig.revoke_confirmation(0_u128);

    multisig.execute_transaction(0_u128);

    let newBalance = target.get_balance();

    assert(getnum(oldBalance) + getnum(12_felt252) == getnum(newBalance), 'invalid result');
}

#[test]
#[available_gas(20000000)]
fn test_nonsigner_can_execute() {
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
fn test_subsequent_transactions_work() {
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
fn test_execute_in_arbitrary_order() {
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

    multisig.confirm_transaction(0_u128);
    multisig.confirm_transaction(1_u128);
    multisig.confirm_transaction(2_u128);    

    let startBalance = target.get_balance();  
    
    multisig.execute_transaction(2_u128);
    let middleBalance1 = target.get_balance();  

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
fn test_execute_complex_arguments() {
    let (multisig, target, signer1) = get_multisig();
    set_contract_address(signer1);

    let selector : felt252 = 1248215369616729131475520150826638084531676903739261877583237611528878977339; // complex_inputs

    let mut first = ArrayTrait::<usize>::new();
    first.append(1_usize);
    first.append(2_usize);
    first.append(3_usize);

    let mut second = ArrayTrait::<Something>::new();
    second.append(Something { first: 4_usize, second: 5_usize });
    second.append(Something { first: 6_usize, second: 7_usize });

    let mut serializedFirst = ArrayTrait::<felt252>::new();
    first.serialize(ref serializedFirst);

    let mut serializedSecond = ArrayTrait::<felt252>::new();
    second.serialize(ref serializedSecond);

    let mut serializedCalldata = ArrayTrait::<felt252>::new();

    // Concatenate the arrays into one

    let mut i : usize = 0;
    loop {
        
        if (i == serializedFirst.len()) {
            break ();
        }
        serializedCalldata.append(*serializedFirst.at(i));
        i = i + 1_usize;
    };

    i = 0;
    loop {
        
        if (i == serializedSecond.len()) {
            break ();
        }
        serializedCalldata.append(*serializedSecond.at(i));
        i = i + 1_usize;
    };

    multisig.submit_transaction(to: target.contract_address, function_selector: selector, function_calldata: serializedCalldata, nonce: 0);
    multisig.confirm_transaction(0_u128);
    multisig.execute_transaction(0_u128);

    let arraySum = target.get_arraySum();  
    assert(arraySum == 28_usize, 'Invalid complex sum');
}

#[test]
#[available_gas(20000000)]
#[should_panic(expected: ('invalid signer','ENTRYPOINT_FAILED'))]
fn test_execute_fails_without_signers() {
    let (multisig, target, signer1) = get_multisig();
    set_contract_address(signer1);

    let selector : felt252 = 667654066930288457060622961440209991290119613176827951904429854971730312982; // set_signers

    let mut signers = ArrayTrait::<felt252>::new();
    let mut serializedSigners = ArrayTrait::<felt252>::new();

    signers.serialize(ref serializedSigners);

    multisig.submit_transaction(to: multisig.contract_address, function_selector: selector, function_calldata: serializedSigners, nonce: 0);     

    multisig.confirm_transaction(0_u128);
    multisig.execute_transaction(0_u128);

    // Unable to submit further transactions
    let mut calldata0 = ArrayTrait::<felt252>::new();
    calldata0.append(12_felt252);
    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata0, nonce: 1);
}

#[test]
#[available_gas(20000000)]
#[should_panic(expected: ('more confirmations required','ENTRYPOINT_FAILED'))]
fn test_too_many_revokes_causes_fail() {
    let (multisig, target, signer1, signer2, signer3) = get_multisig_multiple_signers();

    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(12_felt252);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata, nonce: 0);

    multisig.confirm_transaction(0_u128);
    set_contract_address(signer3);
    multisig.confirm_transaction(0_u128);
    set_contract_address(signer2);
    multisig.confirm_transaction(0_u128);

    set_contract_address(signer1);
    multisig.revoke_confirmation(0_u128);
    set_contract_address(signer3);
    multisig.revoke_confirmation(0_u128);

    multisig.execute_transaction(0_u128);
}

#[test]
#[available_gas(20000000)]
#[should_panic(expected: ('Index out of bounds', 'ENTRYPOINT_FAILED', 'ENTRYPOINT_FAILED'))]
fn test_failing_transaction() {
    let (multisig, target, signer1) = get_multisig();
    set_contract_address(signer1);

    let selector : felt252 = 1302092863696476078013404308903096127447218704794151222339362679185439823229; // 'revertFunc'

    let mut calldata = ArrayTrait::<felt252>::new();

    multisig.submit_transaction(to: target.contract_address, function_selector: selector, function_calldata: calldata, nonce: 0);

    multisig.confirm_transaction(0_u128);
    multisig.execute_transaction(0_u128);
}

#[test]
#[available_gas(20000000)]
#[should_panic(expected: ( 'ENTRYPOINT_NOT_FOUND', 'ENTRYPOINT_FAILED'))]
fn test_nonexistent_function_fails() {
    let (multisig, target, signer1) = get_multisig();
    set_contract_address(signer1);

    let selector : felt252 = 1575552251618309165000590323396181269166558562949911024421340397165687612001; // 'nonExisting'

    let mut calldata = ArrayTrait::<felt252>::new();

    multisig.submit_transaction(to: target.contract_address, function_selector: selector, function_calldata: calldata, nonce: 0);

    multisig.confirm_transaction(0_u128);
    multisig.execute_transaction(0_u128);
}

#[test]
#[available_gas(20000000)]
#[should_panic(expected: ( 'transaction does not exist', 'ENTRYPOINT_FAILED'))]
fn test_nonexistent_transaction_fails() {
    let (multisig, target, signer1) = get_multisig();
    set_contract_address(signer1);

    multisig.execute_transaction(0_u128);
}

#[test]
#[available_gas(20000000)]
#[should_panic(expected: ('transaction already executed','ENTRYPOINT_FAILED'))]
fn test_reexecution_fails() {
    let (multisig, target, signer1) = get_multisig();
    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(12_felt252);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata, nonce: 0);

    multisig.confirm_transaction(0_u128);
    multisig.execute_transaction(0_u128);

    multisig.execute_transaction(0_u128);
}


#[test]
#[available_gas(20000000)]
#[should_panic(expected: ('more confirmations required','ENTRYPOINT_FAILED'))]
fn test_execute_fails_too_few_confirmations() {
    let (multisig, target, signer1) = get_multisig();

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(12_felt252);

    set_contract_address(signer1);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata, nonce: 0);

    multisig.execute_transaction(0_u128);
}