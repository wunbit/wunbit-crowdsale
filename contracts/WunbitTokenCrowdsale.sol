pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";

contract WunbitTokenCrowdsale is Crowdsale, MintedCrowdsale, CappedCrowdsale, TimedCrowdsale {

  // Track contributor constributions
  uint256 public contributorMinCap = 38000000000000000; // 10 USD - 0.038
  uint256 public contributorHardCap = 381080000000000000000; // 100000 USD - 381.08
  mapping(address => uint256) public contributions;

  constructor(
    uint256 _rate,
    address _wallet,
    ERC20 _token,
    uint256 _cap,
    uint256 _openingTime,
    uint256 _closingTime
  )

  Crowdsale(_rate, _wallet, _token)
  CappedCrowdsale(_cap)
  TimedCrowdsale(_openingTime, _closingTime)
  public
  {
  }

  /**
  * @dev Returns the amount contributed so far by a specifci contributor
  * @param _beneficiary Address of the contributor
  & @return User contributions so far
  */
  function getUserContribution(address _beneficiary)
    public view returns (uint256)
  {
      return contributions[_beneficiary];
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


}
