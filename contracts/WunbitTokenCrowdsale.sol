pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/PausableToken.sol";
import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/WhitelistedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/distribution/RefundableCrowdsale.sol";

contract WunbitTokenCrowdsale is Crowdsale, MintedCrowdsale, CappedCrowdsale, TimedCrowdsale, WhitelistedCrowdsale, RefundableCrowdsale {

  // Track contributor constributions
  uint256 public contributorMinCap = 2000000000000000; // 0.002 ether
  uint256 public contributorHardCap = 50000000000000000000; // 50 ether
  mapping(address => uint256) public contributions;

  // Crowdsale stages
  enum CrowdsaleStage { PreSale, PublicSale }
  // Presale, Public Sale
  CrowdsaleStage public stage = CrowdsaleStage.PreSale;

  constructor(
    uint256 _rate,
    address _wallet,
    ERC20 _token,
    uint256 _cap,
    uint256 _openingTime,
    uint256 _closingTime,
    uint256 _goal
  )

  Crowdsale(_rate, _wallet, _token)
  CappedCrowdsale(_cap)
  TimedCrowdsale(_openingTime, _closingTime)
  RefundableCrowdsale(_goal)
  public
  {
    require(_goal <= _cap);
  }

  /**
  * @dev Returns the amount contributed so far by a specifci contributor
  * @param _beneficiary Address of the contributor
  * @return User contributions so far
  */
  function getUserContribution(address _beneficiary)
    public view returns (uint256)
  {
      return contributions[_beneficiary];
  }

  /**
  * @dev Allows admin to update the crowdsale stage
  * @param _stage Crowdsale stage
  */
  function setCrowdsaleStage(uint _stage) public onlyOwner {
    if(uint(CrowdsaleStage.PreSale) == _stage) {
      stage = CrowdsaleStage.PreSale;
    } else if(uint(CrowdsaleStage.PublicSale) == _stage) {
      stage = CrowdsaleStage.PublicSale;
    }

    if(stage == CrowdsaleStage.PreSale) {
      rate = 500;
    } else if (stage == CrowdsaleStage.PublicSale) {
      rate = 250;
    }
  }

  /**
   * @dev forwards funds to the wallet during the presale stage, tren the refund vault during the public sale stage.
   */
  function _forwardFunds() internal {
    if(stage == CrowdsaleStage.PreSale) {
      wallet.transfer(msg.value);
    } else if (stage == CrowdsaleStage.PublicSale) {
      super._forwardFunds();
    }
  }

  /**
  * @dev Extend parent behavior requiring contribution to respect contributor minimum & maximum funding cap.
  * @param _beneficiary Address of the contributor
  * @param _weiAmount Amount of wei contributed
  */
  function _preValidatePurchase(
    address _beneficiary,
    uint256 _weiAmount
  )

  internal
  {
    super._preValidatePurchase(_beneficiary, _weiAmount);
    uint256 _existingContribution = contributions[_beneficiary];
    uint256 _newContribution = _existingContribution.add(_weiAmount);
    require(_newContribution >= contributorMinCap && _newContribution <= contributorHardCap);
    contributions[_beneficiary] = _newContribution;
   }

   /**
   * @dev Enables token transfers, called when owner calls finalize()
   */
   function finalization() internal {
     if(goalReached()) {
       MintableToken _mintableToken = MintableToken(token);
       // Do more stuff for founders, partners
       _mintableToken.finishMinting();
       // Unpause the token
       PausableToken(token).unpause();
     }

     super.finalization();
   }

}
