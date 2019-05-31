// Import all required modules from openzeppelin-test-helpers
const { balance, BN, constants, ether, expectEvent, shouldFail } = require('openzeppelin-test-helpers');

require('chai')
  .use(require('chai-as-promised'))
  .should();

const WunbitTokenCrowdsale = artifacts.require('WunbitTokenCrowdsale');
const WunbitToken = artifacts.require('WunbitToken');

contract('WunbitTokenCrowdsale', function([_, wallet, investor1, investor2]) {

  beforeEach(async function() {
    // Token Config
    this.name = "Wunbit Token";
    this.symbol = 'WUN';
    this.decimals = new BN(18);

    // Deploy Token
    this.token = await WunbitToken.new(
      this.name,
      this.symbol,
      this.decimals
    );

    // Crowdsale Config
    this.rate = new BN(17912);
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

  describe('accepting payments', function() {
    it('should accept payments', async function() {
      const value = await ether(new BN(1));
      const purchaser = investor2;
      await web3.eth.sendTransaction({
        from: investor1,
        to: this.crowdsale.address,
        value: value,
        gas: 4712388
      }).should.be.fulfilled;
    });
  });
});
