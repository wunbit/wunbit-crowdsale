import ether from './helpers/ether';

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const WunbitTokenCrowdsale = artifacts.require('WunbitTokenCrowdsale');
const WunbitToken = artifacts.require('WunbitToken');

contract('WunbitTokenCrowdsale', function([_, wallet, investor1, investor2]) {

  beforeEach(async function() {
    // Token Config
    this.name = "Wunbit Token";
    this.symbol = 'WUN';
    this.decimals = 18;

    // Deploy Token
    this.token = await WunbitToken.new(
      this.name,
      this.symbol,
      this.decimals
    );

    // Crowdsale Config
    this.rate = 17912;
    this.wallet = wallet;

    //Deploy Crowdsale
    this.crowdsale = await WunbitTokenCrowdsale.new(
      this.rate,
      this.wallet,
      this.token.address
    );

  // Transfer token ownership to crowdsale
    await this.token.transferOwnership(this.crowdsale.address);
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
      await this.crowdsale.sendTransaction({ value: ether(1), from: investor1 });
      const newTotalSupply = await this.token.totalSupply();
      assert.isTrue(newTotalSupply > originalTotalSupply);
    });
  });

  describe('accepting payments', function() {
    it('should accept payments', async function() {
      const value = ether(1);
      const purchaser = investor2;
      await this.crowdsale.sendTransaction({ value: value, from: investor1 }).should.be.fulfilled;
      await this.crowdsale.buyTokens(investor1, { value: value, from: purchaser }).should.be.fulfilled;
    });
  });
});
