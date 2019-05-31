pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";

contract WunbitTokenCrowdsale is Crowdsale, MintedCrowdsale {
  constructor(
    uint256 rate,
    address payable wallet,
    IERC20 token
  )

  Crowdsale(rate, wallet, token)
  public
  {
  }

  function() external payable{
  }
}
