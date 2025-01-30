use crate::*;
use anchor_lang::prelude::*;
use errors::CounterError::InvalidRemote;
use oapp::{
    endpoint::{
        cpi::accounts::Clear, instructions::ClearParams, ConstructCPIContext, ID as ENDPOINT_ID,
    },
    LzReceiveParams,
};

#[derive(Accounts)]
#[instruction(params: LzReceiveParams)]
pub struct LzReceive<'info> {
    #[account(mut, seeds = [COUNT_SEED, &count.id.to_be_bytes()], bump = count.bump)]
    pub count: Account<'info, Count>,
    #[account(
        seeds = [REMOTE_SEED, &count.key().to_bytes(), &params.src_eid.to_be_bytes()],
        bump = remote.bump,
        constraint = params.sender == remote.address @ InvalidRemote
    )]
    pub remote: Account<'info, Remote>,
}

impl LzReceive<'_> {
    pub fn apply(ctx: &mut Context<LzReceive>, params: &LzReceiveParams) -> Result<()> {
        let accounts_for_clear = if ctx.remaining_accounts.len() >= Clear::MIN_ACCOUNTS_LEN {
            &ctx.remaining_accounts[0..Clear::MIN_ACCOUNTS_LEN]
        } else {
            &ctx.remaining_accounts[0..ctx.remaining_accounts.len()]
        };

        let seeds: &[&[u8]] = &[
            COUNT_SEED,
            &ctx.accounts.count.id.to_be_bytes(),
            &[ctx.accounts.count.bump],
        ];

        oapp::endpoint_cpi::clear(
            ENDPOINT_ID,
            ctx.accounts.count.key(),
            accounts_for_clear,
            seeds,
            ClearParams {
                receiver: ctx.accounts.count.key(),
                src_eid: params.src_eid,
                sender: params.sender,
                nonce: params.nonce,
                guid: params.guid,
                message: params.message.clone(),
            },
        )?;

        ctx.accounts.count.count += 1;

        Ok(())
    }
}
