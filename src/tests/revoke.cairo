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
fn test_works() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(12_felt252);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata, nonce: 0);
    multisig.confirm_transaction(0_u128);
    multisig.revoke_confirmation(0_u128);

    assert(!multisig.is_confirmed(0, signer1), 'shouldn\'t be confirmed');
    assert(!multisig.is_confirmed(0, signer2), 'should not be confirmed');
    let (transaction, _) = multisig.get_transaction(0);
    assert(transaction.confirmations == 0, 'shouldn\'t have confirmations');
}

#[test]
#[available_gas(20000000)]
fn test_can_revoke_in_any_order() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    let mut calldata0 = ArrayTrait::<felt252>::new();
    calldata0.append(12_felt252);

    let mut calldata1 = ArrayTrait::<felt252>::new();
    calldata1.append(12_felt252);

    let mut calldata2 = ArrayTrait::<felt252>::new();
    calldata2.append(12_felt252);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata0, nonce: 0);
    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata1, nonce: 1);
    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata2, nonce: 2);

    multisig.confirm_transaction(2_u128);
    multisig.confirm_transaction(1_u128);   

    multisig.revoke_confirmation(1_u128);

    assert(!multisig.is_confirmed(0, signer1), 'shouldn\'t be confirmed');
    assert(!multisig.is_confirmed(1, signer1), 'shouldn\'t be confirmed');
    assert(multisig.is_confirmed(2, signer1), 'should be confirmed');
}

#[test]
#[available_gas(20000000)]
#[should_panic(expected: ('transaction not confirmed','ENTRYPOINT_FAILED'))]
fn test_can_revoke_only_own() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    let mut calldata0 = ArrayTrait::<felt252>::new();
    calldata0.append(12_felt252);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata0, nonce: 0);
 
    multisig.confirm_transaction(0_u128);       
    set_contract_address(signer2);
    multisig.revoke_confirmation(0_u128);
}

#[test]
#[available_gas(20000000)]
fn test_can_revoke_own_with_multiple_signers() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    let mut calldata0 = ArrayTrait::<felt252>::new();
    calldata0.append(12_felt252);

    let mut calldata1 = ArrayTrait::<felt252>::new();
    calldata1.append(12_felt252);

    let mut calldata2 = ArrayTrait::<felt252>::new();
    calldata2.append(12_felt252);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata0, nonce: 0);
    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata1, nonce: 1);
    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata2, nonce: 2);

    multisig.confirm_transaction(0_u128);       
    set_contract_address(signer2);
    multisig.confirm_transaction(1_u128);
    multisig.confirm_transaction(2_u128);

    multisig.revoke_confirmation(1_u128);

    set_contract_address(signer1);
    multisig.revoke_confirmation(0_u128);

    assert(!multisig.is_confirmed(0, signer1), 'shouldn\'t be confirmed 1');
    assert(!multisig.is_confirmed(1, signer1), 'shouldn\'t be confirmed 2');
    assert(!multisig.is_confirmed(2, signer1), 'shouldn\'t be confirmed 3');
    assert(!multisig.is_confirmed(0, signer2), 'shouldn\'t be confirmed 4');
    assert(!multisig.is_confirmed(1, signer2), 'shouldn\'t be confirmed 5');
    assert(multisig.is_confirmed(2, signer2), 'should be confirmed 6');
}

#[test]
#[available_gas(20000000)]
#[should_panic(expected: ('transaction does not exist','ENTRYPOINT_FAILED'))]
fn test_non_existing_tx_fails() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    multisig.revoke_confirmation(0_u128);
}

#[test]
#[available_gas(20000000)]
#[should_panic(expected: ('transaction already executed','ENTRYPOINT_FAILED'))]
fn test_revoking_executed_tx_fails() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(12_felt252);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata, nonce: 0);
    multisig.confirm_transaction(0_u128);
    multisig.execute_transaction(0_u128);
    multisig.revoke_confirmation(0_u128);
}

#[test]
#[available_gas(20000000)]
#[should_panic(expected: ('transaction not confirmed','ENTRYPOINT_FAILED'))]
fn test_rerevoking_fail() {
    let (multisig, target, signer1, signer2) = get_multisig();
    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(12_felt252);

    multisig.submit_transaction(to: target.contract_address, function_selector: FUNCTION_SELECTOR, function_calldata: calldata, nonce: 0);
    multisig.confirm_transaction(0_u128);
    multisig.revoke_confirmation(0_u128);
    multisig.revoke_confirmation(0_u128);
}
