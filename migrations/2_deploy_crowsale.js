var WunbitToken = artifacts.require("./WunbitToken.sol");

module.exports = function(deployer) {
  const name = "Wunbit Token";
  const symbol = "WUN";
  const decimals = 18;

  deployer.deploy(WunbitToken, name, symbol, decimals);
};
