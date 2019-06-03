import ether from './helpers/ether';
import EVMRevert from './helpers/EVMRevert';
import { increaseTimeTo, duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const WunbitTokenCrowdsale = artifacts.require('WunbitTokenCrowdsale');
const WunbitToken = artifacts.require('WunbitToken');
const RefundVault = artifacts.require('./RefundVault');

contract('WunbitTokenCrowdsale', function([_, wallet, contributor1, contributor2]) {

  before(async function() {
    // Transfer extra ether to contributor1 account for testing
    await web3.eth.sendTransaction({ from: _, to: contributor1, value: ether(25) });
  })

  beforeEach(async function() {
    // Token Config
    this.name = "Wunbit Token";
    this.symbol = 'WUN';
    this.decimals = 18;

    // Deploy Token
    this.token = await WunbitToken.new(
      this.name,
      this.symbol,
      this.decimals,
    );

    // Crowdsale Config
    this.rate = 500;
    this.wallet = wallet;
    this.cap = ether(100);
    this.openingTime = latestTime() + duration.weeks(1);
    this.closingTime = this.openingTime + duration.weeks(1);
    this.goal = ether(50);

    // Contributor Caps
    this.contributorMinCap = ether(0.002);
    this.contributorHardCap = ether(50);

    // Token Sale stages
    this.preSaleStage = 0;
    this.preSaleRate = 500;
    this.publicSaleStage = 1;
    this.publicSaleRate = 250;

    //Deploy Crowdsale
    this.crowdsale = await WunbitTokenCrowdsale.new(
      this.rate,
      this.wallet,
      this.token.address,
      this.cap,
      this.openingTime,
      this.closingTime,
      this.goal
    );

    // Pause the token
    await this.token.pause();

  // Transfer token ownership to crowdsale
  await this.token.transferOwnership(this.crowdsale.address);

  // Add contributors to Whitelist
  await this.crowdsale.addManyToWhitelist([contributor1, contributor2]);

  // Track refund vault
  this.vaultAddress = await this.crowdsale.vault();
  this.vault = RefundVault.at(this.vaultAddress);

  // Advance time to crowdsale start
  await increaseTimeTo(this.openingTime + 1);
  });

  describe ('crowdsale', function() {
    it('tracks the rate', async function() {
      const rate = await this.crowdsale.rate();
      rate.should.be.bignumber.equal(this.rate);
    });

    it('tracks the wallet', async function() {
      const wallet = await this.crowdsale.wallet();
      wallet.should.equal(this.wallet);
    });

    it('tracks the token', async function() {
      const token = await this.crowdsale.token();
      token.should.equal(this.token.address);
    });
  });

  describe('minted crowdsale', function() {
    it('mints tokens after purchase', async function() {
      const originalTotalSupply = await this.token.totalSupply();
      await this.crowdsale.sendTransaction({ value: ether(1), from: contributor1 });
      const newTotalSupply = await this.token.totalSupply();
      assert.isTrue(newTotalSupply > originalTotalSupply);
    });
  });

  describe('capped crowdsale', function() {
    it('has the correct hard cap', async function() {
      const cap = await this.crowdsale.cap();
      cap.should.be.bignumber.equal(this.cap);
    });
  });

  describe('timed crowdsale', function() {
    it('is open', async function() {
      const isClosed = await this.crowdsale.hasClosed();
      isClosed.should.be.false;
    });
  });

  describe('whitelisted crowdsale', function() {
    it('rejects contributions from non-whitelisted contributors', async function() {
      const notWhitelisted = _;
      await this.crowdsale.buyTokens(notWhitelisted, { value: ether(1), from: notWhitelisted }).should.be.rejectedWith(EVMRevert);
    });
  });

  describe('refundable crowdsale', function() {
    beforeEach(async function() {
      await this.crowdsale.buyTokens(contributor1, { value: ether(1), from: contributor1 });
    });

    describe('during crowdsale', function() {
      it('prevents the contributor from claiming refund', async function() {
        await this.vault.refund(contributor1, { from: contributor1 }).should.be.rejectedWith(EVMRevert);
      });
    });

    describe('when the crowdsale is in the presale stage', function() {
      beforeEach(async function() {
        // Crowdsale stage is already Presale by default
        await this.crowdsale.buyTokens(contributor1, { value: ether(1), from: contributor1 });
      });

      it('forwards funds to the wallet', async function() {
        const balance = await web3.eth.getBalance(this.wallet);
        console.log({balance : web3.fromWei(balance).toNumber()}, { ether: web3.fromWei(ether(100)).toNumber()
        });
        //expect(web3.fromWei(balance).toNumber()).to.be.above(ether(100));
        expect(web3.fromWei(balance).toNumber()).to.be.above(web3.fromWei(ether(100)).toNumber());
      });
    });

    describe('when the crowdsale is in the public stage', function() {
      beforeEach(async function() {
        await this.crowdsale.setCrowdsaleStage(this.publicSaleStage, { from: _ });
        await this.crowdsale.buyTokens( contributor1, { value: ether(1), from: contributor1 });
      });

      it('forwards funds to the refund vault', async function() {
        const balance = await web3.eth.getBalance(this.vaultAddress);
        expect(balance.toNumber()).to.be.above(0);
      });
    });
  });

  describe('crowdsale stages', function() {
    it('starts in presale stage', async function () {
      const stage = await this.crowdsale.stage();
      stage.should.be.bignumber.equal(this.preSaleStage);
    });

    it('starts at the presale rate', async function() {
      const rate = await this.crowdsale.rate();
      rate.should.be.bignumber.equal(this.preSaleRate);
    });

    it('allows the admin to update the stage & the rate', async function() {
      await this.crowdsale.setCrowdsaleStage(this.publicSaleStage, { from: _ });
      const stage = await this.crowdsale.stage();
      stage.should.be.bignumber.equal(this.publicSaleStage);
      const rate = await this.crowdsale.rate();
      rate.should.be.bignumber.equal(this.publicSaleRate);
    });

    it('prevents non-admin to update the stage', async function() {
      await this.crowdsale.setCrowdsaleStage(this.publicSaleStage, { from: contributor1 }).should.be.rejectedWith(EVMRevert);
    });
  });

  describe('accepting payments', function() {
    it('should accept payments', async function() {
      const value = ether(1);
      const purchaser = contributor2;
      await this.crowdsale.sendTransaction({ value: value, from: contributor1 }).should.be.fulfilled;
      await this.crowdsale.buyTokens(contributor1, { value: value, from: purchaser }).should.be.fulfilled;
    });
  });

  describe('buy tokens', function() {
    describe('when the contribution is less than the minimum cap', function () {
        it('rejects the transaction', async function (){
          const value = this.contributorMinCap.minus(1);
          await this.crowdsale.buyTokens(contributor2, { value: value, from: contributor2 }).should.be.rejectedWith(EVMRevert);
        });
    });

    describe('when the contributor has already met the minimum cap', function () {
        it('allows the contributor to contribute below the minimum cap', async function (){
          // First contribution is valid
          const value1 = ether(1);
          await this.crowdsale.buyTokens(contributor1, { value: value1, from: contributor1 });
          // Second contribution is less than contributor cap
          const value2 = 1; // wei
          await this.crowdsale.buyTokens(contributor1, { value: value2, from: contributor1 }).should.be.fulfilled;
        });
    });
  });

  describe('when the total contribution exceed the contributor hard cap', function () {
      it('rejects the transaction', async function (){
        // First contribution is in valid range
        const value1 = ether(2);
        await this.crowdsale.buyTokens(contributor1, { value: value1, from: contributor1 });
        // Second contribution sends total contributions over the contributor hard cap
        const value2 = ether(49);
        await this.crowdsale.buyTokens(contributor1, { value: value2, from: contributor1 }).should.be.rejectedWith(EVMRevert);
      });
  });

  describe('when the total contribution is within valid range', function () {
    const value = ether(2);
    it('succeeds & updates the contribution amount', async function() {
      await this.crowdsale.buyTokens(contributor2, { value: value, from: contributor2 }).should.be.fulfilled;
      const contribution = await this.crowdsale.getUserContribution(contributor2);
      contribution.should.be.bignumber.equal(value);
    });
  });

  describe('token transfers', function () {
    it('does not allow contributors to transfer tokens during crowdsale', async function() {
      // Buy some tokens first
      await this.crowdsale.buyTokens(contributor1, { value: ether(1), from: contributor1 });

      // Attempt to transfer tokens during crowdsale
      await this.token.transfer(contributor2, 1, { from: contributor1 }).should.be.rejectedWith(EVMRevert);
    });
  });

  describe('finalizing the crowdsale', function () {
    describe('when the goal is not reached', function () {
      beforeEach(async function () {
      // Do not meet the goal
      await this.crowdsale.buyTokens(contributor2, { value: ether(1), from: contributor2 });
      // Fast forward past end time
      await increaseTimeTo(this.closingTime + 1);
      // Finalize the crowdsale
      await this.crowdsale.finalize({ from: _ });
      });

      it('allows the contributor to claim refund', async function() {
        await this.vault.refund(contributor2, { from: contributor2 }).should.be.fulfilled;
      });
    });

    describe('when the goal is reached', function () {
        beforeEach(async function () {
          // track current wallet balance
          this.walletBalance = await web3.eth.getBalance(wallet);
          // Meet the goal
          await this.crowdsale.buyTokens(contributor1, { value: ether(26), from: contributor1 });
          await this.crowdsale.buyTokens(contributor2, { value: ether(26), from: contributor2 });
          // Fastforward past end time
          await increaseTimeTo(this.closingTime + 1);
          // Finalize the crowdsale
          await this.crowdsale.finalize({ from: _ });
        });

        it('handles goal reached', async function() {
          // Tracks goal reached
          const goalReached = await this.crowdsale.goalReached();
          goalReached.should.be.true;

          // Finishes minting token
          const mintingFinished = await this.token.mintingFinished();
          mintingFinished.should.be.true;

          // Unpauses the token
          const paused = await this.token.paused();
          paused.should.be.false;

          // Prevents contributor from claiming refund
          await this.vault.refund(contributor1, { from: contributor1 }).should.be.rejectedWith(EVMRevert);
        });
    });
  });
});
