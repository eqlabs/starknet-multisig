use starsign::multisig::Multisig;
use starsign::multisig::IMultisigDispatcher;
use starsign::multisig::IMultisigDispatcherTrait;

use starknet::syscalls::deploy_syscall;
use starknet::ContractAddress;
use starknet::contract_address_const;
use starknet::testing::set_caller_address;
use starknet::class_hash::Felt252TryIntoClassHash;
use starknet::get_caller_address;

use traits::Into;
use traits::TryInto;
use serde::Serde;
use array::ArrayTrait;
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
fn test_submit_transaction() {
    let (multisig, signer1) = get_multisig();
set_caller_address(signer1);

    signer1.print();
    let a : ContractAddress = get_caller_address();
    a.print();

    
    let function_selector = 100;
    multisig.submit_transaction(to: multisig.contract_address, :function_selector, calldata: sample_calldata(), nonce: 0);

    // let (transaction, calldata) = multisig.get_transaction(0);

    // assert(transaction.to == multisig.contract_address, 'should match target address');
    // assert(transaction.function_selector == function_selector, 'should match function selector');
    // assert(transaction.calldata_len == sample_calldata().len(), 'should match calldata length');
    // assert(!transaction.executed, 'should not be executed');
    // assert(transaction.confirmations == 0, 'should not have confirmations');
// TODO: compare calldata when loops are supported
}

// #[test]
// #[available_gas(2000000)]
// #[should_panic]
// fn test_submit_transaction_not_signer() {
//     let signer = contract_address_const::<1>();
//     let mut signers = ArrayTrait::new();
//     signers.append(signer);
//     Multisig::constructor(:signers, threshold: 1);

//     set_caller_address(contract_address_const::<3>());
//     Multisig::submit_transaction(
//         to: contract_address_const::<42>(),
//         function_selector: 10,
//         calldata: sample_calldata(),
//         nonce: 0
//     );
// }

// #[test]
// #[available_gas(2000000)]
// #[should_panic]
// fn test_submit_transaction_invalid_nonce() {
//     let signer = contract_address_const::<1>();
//     let mut signers = ArrayTrait::new();
//     signers.append(signer);
//     Multisig::constructor(:signers, threshold: 1);

//     set_caller_address(signer);
//     Multisig::submit_transaction(
//         to: contract_address_const::<42>(),
//         function_selector: 10,
//         calldata: sample_calldata(),
//         nonce: 1
//     );
// }