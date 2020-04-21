const Remittance = artifacts.require("Remittance.sol");
const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');

// build up a new Splitter contract before each test

contract('Remittance', (accounts) => {

  //Activate when uncertain in which network you are
  //console.log(web3.currentProvider)

  //setting up the instance
  let contractInstance;

  //setting up three accounts
  const [sender, one, two, three, four] = accounts;

  //set pw1
  const pw1 = "beer1234";

  //Set up a new contract before each test
  beforeEach("set up conract", async () => {
    //sender deploys the contract
    contractInstance =  await Remittance.new({from: sender});
  });

  //test if the internal balance starts with 0

  it('test: the should be 0', async () => {
      const contractBalance = await web3.eth.getBalance(contractInstance.address);
      assert.strictEqual(contractBalance, '0',"contract balance isn't 0");
  });

  //test the LogDeploy event
  it("test: LogDeploy-event should be emitted", async() => {
    //setting the amount
    const hash = await contractInstance.hash(one, web3.utils.toHex(pw1));

    const amount = web3.utils.toWei("1", "Gwei");
    const latestBlock = 1;//await web3.eth.getBlock("latest");
    //call the contract from sender
    const deployObject = await contractInstance.sendRemittance(hash, latestBlock , {from: sender, value: 2000});
    const { logs } = deployObject;
    const checkEvent = deployObject.logs[0];
    truffleAssert.eventEmitted(deployObject, "LogDeploy");
    assert.strictEqual(checkEvent.args.sender, sender, "sender isn't right");
    assert.strictEqual(checkEvent.args.deadline, BN(1), "latestBlock is not right");
    assert.strictEqual(checkEvent.args.amount, BN(2000), "amount is not right");
    assert.strictEqual(checkEvent.args.hash.toString(), hash.toString(), "hash problem");
    //assert.strictEqual(checkEvent.args.splittetValue.toString(), web3.utils.toWei("0.5", "Gwei").toString());

    //plotting
    //truffleAssert.prettyPrintEmittedEvents(split);
    //console.log(JSON.stringify(split, null, 4));
   });


});
