pragma solidity ^0.5.8;

//for´killing
import "./Killable.sol";
//using openzeppelin
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract Remittance is Killable{

    using SafeMath for uint;

    //max waiting time || (7 [days] * 86400 [seconds])/15[seconds]) | 15 = average block time | https://etherscan.io/chart/blocktime; it's something from 11-19 [seconds].. so here it is 15 [seconds]..
    //https://solidity.readthedocs.io/en/v0.4.24/units-and-global-variables.html#time-units
    uint constant maxRemittancePeriod = 7 * 1 days / 15; //this is the max period! in seconds

    //struct for setting the data
    struct Remittance {
      uint amount;
      uint deadline;
      address sender;
    }
    //Set up events
       event LogDeploy(address indexed sender, uint deadline, uint amount, bytes32 hash);
       event LogWithdraw(address indexed sender, bytes32 hash);
       event LogCancel(address indexed sender, bytes32 hash, uint amount, uint  deadline);

    //setting up a mapping
    mapping(bytes32 => Remittance) public remittances;

    constructor() public{
    }

  //setting up a function to hash inside the contract, because it is not clear which hash function the participants use
  //setting up the secret with the address of the address of the exchange shop (one password less), the password from bob and the address of this contract(for using it only once)
  function hash(address exchange, bytes32 password) public view returns(bytes32 hash){
    require(exchange != address(0x0), "the addresses can't be 0x0");
    hash = keccak256(abi.encodePacked(exchange, password, address(this)));
  }

  //function to set up the riddle with the hash and the date
  function sendRemittance(bytes32 hash, uint remittancePeriod) public payable {
    //amount from msg.sender
    uint amount = msg.value;

    require(amount > 0, "greater than zero");
    require(remittancePeriod <= maxRemittancePeriod, "Deadline!");
    //using the storage // https://medium.com/cryptologic/memory-and-storage-in-solidity-4052c788ca86
    Remittance storage r = remittances[hash];
    //checking that the pw or acc isn't already set
    require(r.sender == address(0), "wrong pw or acc");

    uint deadline = now.add(remittancePeriod); //for Setting the right period!

    r.sender = msg.sender;
    r.amount = amount;
    r.deadline = deadline;
    //event
    emit LogDeploy(msg.sender, deadline, msg.value, hash);
  }

  //withdraw the funds like in the splitter project but with .call!
  function withdraw(bytes32 password) public {
    bytes32 hash = hash(msg.sender, password);
    Remittance storage r = remittances[hash];
    uint withdrawAmount = r.amount;
    require(now <= r.deadline, "he got one week");
    require(withdrawAmount > 0,"nothing to withdraw");
    r.amount = 0;
    r.deadline = 0;
    //event
    emit LogWithdraw(msg.sender, hash);
    (bool success, ) = msg.sender.call.value(withdrawAmount)("");
       require(success, "Transfer failed");
  }

  function cancelRemittance(bytes32 hash) public payable whenAlive {

    Remittance storage r = remittances[hash];
    uint cancelAmount = r.amount;
    uint deadline = r.deadline;
    require(r.sender == msg.sender, "wrong msg.sender");
    require(deadline < now, "the deadline has not yet expired");
    require(cancelAmount > 0,"nothing to withdraw");
    emit LogCancel(msg.sender, hash, cancelAmount, deadline);
    r.amount = 0;
    r.deadline = 0;

    (bool success, ) = msg.sender.call.value(cancelAmount)("");
       require(success, "Transfer failed");
  }


}
