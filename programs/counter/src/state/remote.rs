use crate::*;

#[account]
#[derive(InitSpace)]
pub struct Remote {
    pub address: [u8; 32],
    pub bump: u8,
}

impl Remote {
    pub const SIZE: usize = 8 + Self::INIT_SPACE;
}
