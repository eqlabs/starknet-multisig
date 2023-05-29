use starsign::multisig::Multisig;
use starsign::multisig::IMultisigDispatcher;
use starsign::multisig::IMultisigDispatcherTrait;

use starknet::syscalls::deploy_syscall;
use starknet::ContractAddress;
use starknet::contract_address_const;
use starknet::testing::set_contract_address;
use starknet::class_hash::Felt252TryIntoClassHash;
use starknet::get_caller_address;

use traits::Into;
use traits::TryInto;
use serde::Serde;
use array::ArrayTrait;
use array::SpanTrait;
use option::OptionTrait;
use result::ResultTrait;

use debug::PrintTrait;

fn sample_calldata() -> Array::<felt252> {
    let mut calldata = ArrayTrait::new();
    calldata.append(1);
    calldata.append(2);
    calldata.append(3);
    calldata
}

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
fn test_works() {
    let (multisig, signer1) = get_multisig();
    set_contract_address(signer1);

    let mut used_calldata = ArrayTrait::<felt252>::new();
    used_calldata.append(1_felt252);
    used_calldata.append(2_felt252);
    used_calldata.append(3_felt252);

    let calldata_span = used_calldata.span();
    
    let function_selector = 100;
    multisig.submit_transaction(to: multisig.contract_address, :function_selector, function_calldata: used_calldata, nonce: 0);

    let (transaction, retrievedCalldata) = multisig.get_transaction(0);

    assert(transaction.to == multisig.contract_address, 'should match target address');
    assert(transaction.function_selector == function_selector, 'should match function selector');
    assert(transaction.calldata_len == sample_calldata().len(), 'should match calldata length');
    assert(!transaction.executed, 'should not be executed');
    assert(transaction.confirmations == 0, 'should not have confirmations');
     
    assert(calldata_span.len() == retrievedCalldata.len(), 'invalid calldata length') ;

    // check calldata
    let mut i : usize = 0;
    loop {
        if (i == retrievedCalldata.len()) {
            break ();
        }
        assert(*calldata_span.at(i) == *retrievedCalldata.at(i), 'invalid calldata');

        i = i + 1_usize;
    }
}

#[test]
#[available_gas(2000000)]
fn test_empty_values_works() {
    let (multisig, signer1) = get_multisig();
    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<felt252>::new();
    
    let function_selector = 0;
    let dummyAddress = contract_address_const::<0>(); 
    multisig.submit_transaction(to: dummyAddress, :function_selector, function_calldata: calldata, nonce: 0);

    let (transaction, retrievedCalldata) = multisig.get_transaction(0);

    assert(transaction.to == dummyAddress, 'should match target address');
    assert(transaction.function_selector == function_selector, 'should match function selector');
    assert(transaction.calldata_len == 0, 'should match calldata length');
    assert(!transaction.executed, 'should not be executed');
    assert(transaction.confirmations == 0, 'should not have confirmations');
}

#[test]
#[available_gas(2000000)]
#[should_panic(expected: ('invalid nonce','ENTRYPOINT_FAILED'))]
fn test_too_big_nonce_fails() {
    let (multisig, signer1) = get_multisig();
    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(1_felt252);
    
    let function_selector = 100;
    multisig.submit_transaction(to: multisig.contract_address, :function_selector, function_calldata: calldata, nonce: 1);
}

#[test]
#[available_gas(2000000)]
#[should_panic(expected: ('invalid nonce','ENTRYPOINT_FAILED'))]
fn test_too_small_nonce_fails() {
    let (multisig, signer1) = get_multisig();
    set_contract_address(signer1);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(1_felt252);

    let mut calldata2 = ArrayTrait::<felt252>::new();
    calldata2.append(1_felt252);
    
    let function_selector = 100;
    multisig.submit_transaction(to: multisig.contract_address, :function_selector, function_calldata: calldata, nonce: 0);
    multisig.submit_transaction(to: multisig.contract_address, :function_selector, function_calldata: calldata2, nonce: 0);
}

#[test]
#[available_gas(2000000)]
#[should_panic(expected: ('invalid signer','ENTRYPOINT_FAILED'))]
fn test_non_signer_submit_fails() {
    let (multisig, signer1) = get_multisig();
    let user2 = contract_address_const::<20>();   
    set_contract_address(user2);

    let mut calldata = ArrayTrait::<felt252>::new();
    calldata.append(1_felt252);
    
    let function_selector = 100;
    multisig.submit_transaction(to: multisig.contract_address, :function_selector, function_calldata: calldata, nonce: 0);
}