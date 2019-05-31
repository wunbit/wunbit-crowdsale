pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract WunbitToken is ERC20, ERC20Detailed, ERC20Mintable, ERC20Pausable, Ownable {
  constructor (
    string memory name,
    string memory symbol,
    uint8 decimals
  )
    ERC20Detailed(name, symbol, decimals)
    public
    {}
}
