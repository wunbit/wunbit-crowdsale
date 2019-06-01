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

contract('WunbitTokenCrowdsale', function([_, wallet, contributor1, contributor2]) {

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
    this.rate = 17912;
    this.wallet = wallet;
    this.cap = ether(62021);
    this.openingTime = latestTime() + duration.weeks(1);
    this.closingTime = this.openingTime + duration.weeks(1);

    // contributor Caps
    this.contributorMinCap = ether(0.038);
    this.contributorHardCap = ether(381.08);

    //Deploy Crowdsale
    this.crowdsale = await WunbitTokenCrowdsale.new(
      this.rate,
      this.wallet,
      this.token.address,
      this.cap,
      this.openingTime,
      this.closingTime
    );

  // Transfer token ownership to crowdsale
  await this.token.transferOwnership(this.crowdsale.address);

  // Add contributors to Whitelist
  await this.crowdsale.addManyToWhitelist([contributor1, contributor2]);

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
        })
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

    describe('when the total contribution exceed the contributor hard cap', function () {
        it('rejects the transaction', async function (){
          // First contribution is in valid range
          const value1 = ether(1);
          await this.crowdsale.buyTokens(contributor1, { value: value1, from: contributor1 });
          // Second contribution sends total contributions over the contributor hard cap
          const value2 = ether(390);
          await this.crowdsale.buyTokens(contributor1, { value: value2, from: contributor1 }).should.be.rejectedWith(EVMRevert);
        });
    });

    describe('when the total contribution is wihtin valid range', function () {
      const value = ether(2);
      it('succeeds & updates the contribution amount', async function() {
        await this.crowdsale.buyTokens(contributor2, { value: value, from: contributor2 }).should.be.fulfilled;
        const contribution = await this.crowdsale.getUserContribution(contributor2);
        contribution.should.be.bignumber.equal(value);
      });
    });
  });
});
