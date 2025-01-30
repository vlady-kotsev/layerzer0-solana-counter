use crate::*;

#[account]
#[derive(InitSpace)]
pub struct Count {
    pub id: u8,
    pub admin: Pubkey,
    pub count: u64,
    // pub composed_count: u64,
    pub bump: u8,
    pub endpoint_program: Pubkey,
}

impl Count {
    pub const SIZE: usize = 8 + Self::INIT_SPACE;
}

#[account]
#[derive(InitSpace)]
pub struct LzReceiveTypesAccounts {
    pub count: Pubkey,
}

impl LzReceiveTypesAccounts {
    pub const SIZE: usize = 8 + Self::INIT_SPACE;
}
