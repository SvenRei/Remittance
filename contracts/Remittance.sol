pragma solidity ^0.5.8;

//for´killing
import "./Killable.sol";
//using openzeppelin
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract Remittance is Killable{

    using SafeMath for uint;

    //max waiting time || (7 [days] * 86400 [seconds])/15[seconds]) | 15 = average block time | https://etherscan.io/chart/blocktime; it's something from 11-19 [seconds].. so here it is 15 [seconds]..
    uint constant maxDeadline = 7 * 86400 / 15;

    //struct for setting the data
    struct Dataset{
      uint amount;
      uint maxDate;
      address sender;
    }

    //Set up events
    event LogDeploy(address indexed sender, uint deadline, uint amount, bytes32 hash);
    event LogWithdraw(address indexed sender, bytes32 hash);

    //setting up a mapping
    mapping(bytes32 => Dataset) public data;

  //setting up a function to hash inside the contract, because it is not clear which hash function the participants use
  //setting up the secret with the address of the address of the exchange shop (one password less), the passwort from bob and the address of this contract(for using it only once)
  function hash(address exchange, bytes32 passwort) public view returns(bytes32 hash){
    hash = keccak256(abi.encodePacked(exchange, passwort, address(this)));
  }

  //function to set up the riddle with the hash and the date
  function deploy(bytes32 hash, uint maxDate) public payable {
    //amount from msg.sender
    uint amount = msg.value;

    require(amount > 0, "greater than zero");
    require(maxDate < maxDeadline, "Deadline!");
    //using the storage // https://medium.com/cryptologic/memory-and-storage-in-solidity-4052c788ca86
    Dataset storage d = data[hash];
    //checking that the pw or acc isn't already set
    require(d.sender == address(0), "wrong pw or acc");
    d.sender = msg.sender;
    d.amount = amount;
    d.maxDate = maxDate;
    //event
    emit LogDeploy(msg.sender, maxDate, msg.value, hash);
  }
  //withdraw the funds like in the splitter project but with .call!
  function withdraw(bytes32 password) public {
    bytes32 hash = hash(msg.sender, password);
    Dataset storage d = data[hash];
    uint withdrawAmount = d.amount;
    d.amount = 0;
    d.maxDate = 0;
    //event
    emit LogWithdraw(msg.sender, hash);
    (bool success, ) = msg.sender.call.value(withdrawAmount)("");
       require(success, "Transfer failed.");

  }


}
