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

  //timetravel; from: https://medium.com/coinmonks/testing-solidity-with-truffle-and-async-await-396e81c54f93
  const timeTravel = function (time) {
    return new Promise((resolve, reject) => {
      //I think here is the problem somewhere with .sendAsync or .send
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time], // 86400 is num seconds in day
        id: new Date().getTime()
      }, (err, result) => {
        if(err){ return reject(err) }
        return resolve(result)
      });
    })
  }


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
    const maxDate = 23040;
    //call the contract from sender
    const deployObject = await contractInstance.sendRemittance(hash, maxDate , {from: sender, value: amount});
    const { logs } = deployObject;
    const checkEvent = deployObject.logs[0];
    truffleAssert.eventEmitted(deployObject, "LogDeploy");
    assert.strictEqual(checkEvent.args.sender, sender, "sender isn't right");
    assert.strictEqual(checkEvent.args.deadline.toString(), maxDate.toString(), "latestBlock is not right");
    assert.strictEqual(checkEvent.args.amount.toString(),amount.toString() , "amount is not right");
    assert.strictEqual(checkEvent.args.hash, hash, "hash problem");

   });


   //test the LogDeploy event
   it("test: LogWithdraw-event should be emitted", async() => {
     //setting the amount
     const hash = await contractInstance.hash(one, web3.utils.toHex(pw1));

     const amount = web3.utils.toWei("1", "Gwei");
     const maxDate = 23040;
     //call the contract from sender
     await contractInstance.sendRemittance(hash, maxDate , {from: sender, value: amount});

     const withdrawObject = await contractInstance.withdraw(web3.utils.toHex(pw1) , {from: one});
     const { logs } = withdrawObject;
     const checkEvent = withdrawObject.logs[0];
     truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
     assert.strictEqual(checkEvent.args.sender, one, "sender isn't right");
     assert.strictEqual(checkEvent.args.hash, hash, "hash problem");

    });

    //test the LogDeploy event
    it("test: LogCancel-event should be emitted", async() => {
      //setting the amount
      const hash = await contractInstance.hash(one, web3.utils.toHex(pw1));

      const amount = web3.utils.toWei("1", "Gwei");
      const maxDate = 23040;

      //call the contract from sender
      await contractInstance.sendRemittance(hash, maxDate , {from: sender, value: amount});



      await timeTravel(86400 * 8) //8 days later

      const cancelObject = await contractInstance.cancelRemittance(hash , {from: sender});
      const { logs } = cancelObject;
      const checkEvent = cancelObject.logs[0];
      truffleAssert.eventEmitted(cancelObject, "LogWithdraw");
      assert.strictEqual(checkEvent.args.sender, one, "sender isn't right");
      assert.strictEqual(checkEvent.args.hash, hash, "hash problem");
      assert.strictEqual(checkEvent.args.amount.toString(),amount.toString() , "amount is not right");
      assert.strictEqual(checkEvent.args.deadline.toString(), maxDate.toString(), "latestBlock is not right");

     });
});
