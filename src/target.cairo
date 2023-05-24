#[abi]
trait ITarget {
    #[view]
    fn get_balance() -> felt252;

    #[external]
    fn increase_balance(amount: felt252);
}

#[contract]
mod Target {

    struct Storage {
        balance : felt252
    }

    #[external]
    fn increase_balance(amount: felt252) {
        assert(amount != 0, 'Amount must be positive');
        let res = balance::read();
        balance::write(res + amount);
    }

    #[view]
    fn get_balance() -> felt252 {
        balance::read()
    }
}