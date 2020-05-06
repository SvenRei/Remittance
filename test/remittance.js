const Remittance = artifacts.require("Remittance.sol");
const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
const helper = require('ganache-time-traveler');



contract('Remittance', (accounts) => {
  //setting up the instance
  let contractInstance;

  //setting up three accounts
  const [sender, one, two, three, four] = accounts;

  //set pw1
  const pw1 = "beer1234";
  const pw2 = "test1234";
  // build up a new Splitter contract before each test
  const SECONDS_IN_DAY = 86400

  const { toBN } = web3.utils;
  const { toWei } = web3.utils;
  

  //Set up a new contract before each test
  beforeEach("set up conract", async () => {
    //sender deploys the contract
    contractInstance =  await Remittance.new({from: sender});
  });

  //test if the internal balance starts with 0
  it('test: start balanace should be 0', async () => {
      const contractBalance = await web3.eth.getBalance(contractInstance.address);
      assert.strictEqual(contractBalance, '0',"contract balance isn't 0");

  });

  it("test: should kill the contract", async () => {
    await contractInstance.pause({from: sender});
    const killObj = await contractInstance.kill({ from: sender });
    const { logs } = killObj;
    const killEvent = killObj.logs[0];
    truffleAssert.eventEmitted(killObj, "LogKilled");
    assert.strictEqual(killEvent.args.sender, sender, "not the owner");
   });

  it("test: LogRefunds-event should be emitted", async() => {
   const hash = await contractInstance.hash(one, web3.utils.toHex(pw1));

   const amount = toWei("1", "Gwei");
   const deadline = 23040;
   //call the contract from sender
   await contractInstance.sendRemittance(hash, deadline , {from: sender, value: amount});

   await contractInstance.pause({ from: sender });
   await contractInstance.kill({ from: sender });
   const refundObj = await contractInstance.safeFunds({ from: sender });

   const { logs } = refundObj;
   const refundEvent = refundObj.logs[0];
   truffleAssert.eventEmitted(refundObj, "LogRefunds");
   assert.strictEqual(refundEvent.args.sender, sender, "not the owner");
   assert.strictEqual(refundEvent.args.refunds.toString(), amount.toString(), "not the right refund");
 });

  it("test: LogDeploy-event should be emitted", async() => {
    //setting the amount
    const hash = await contractInstance.hash(one, web3.utils.toHex(pw1));

    //const amount = web3.utils.toWei("1", "Gwei");
    const amount = toWei("1", "Gwei");
    const deadline = 23040;
    //call the contract from sender
    const remittanceObject = await contractInstance.sendRemittance(hash, deadline , {from: sender, value: amount});

    const getBlock = await web3.eth.getBlock('latest');
    const getTime = getBlock.timestamp + deadline; //get time + deadline for checking LogDeploy-event

    const { logs } = remittanceObject;
    const remittanceEvent = remittanceObject.logs[0];
    truffleAssert.eventEmitted(remittanceObject, "LogDeploy");

    assert.strictEqual(remittanceEvent.args.sender, sender, "sender isn't right");
    assert.strictEqual(remittanceEvent.args.deadline.toString(), getTime.toString(), "latestBlock is not right");
    assert.strictEqual(remittanceEvent.args.amount.toString(),amount.toString() , "amount is not right");
    assert.strictEqual(remittanceEvent.args.hash, hash, "hash problem");
   });

  it("test: deploy 2 funds in the contract | calling sendRemittance from different accounts", async() => {
     //setting the amount
     const hash = await contractInstance.hash(one, web3.utils.toHex(pw1));

     const amount = toWei("1", "Gwei");
     const deadline = 23040;
     //call the contract from sender
     const remittanceObject = await contractInstance.sendRemittance(hash, deadline , {from: sender, value: amount});
     const { logs } = remittanceObject;
     const remittanceEvent = remittanceObject.logs[0];
     truffleAssert.eventEmitted(remittanceObject, "LogDeploy");
     assert.strictEqual(remittanceEvent.args.amount.toString(),amount.toString() , "amount is not right");
     //truffleAssert.prettyPrintEmittedEvents(deployObject);

     //setting the amount
     const hash1 = await contractInstance.hash(two, web3.utils.toHex(pw2));

     const amount1 = toWei("2", "Gwei");
     const deadline1 = 24040;
     //call the contract from one
     const remittanceObject1 = await contractInstance.sendRemittance(hash1, deadline1 , {from: one, value: amount1});
     const { logs1 } = remittanceObject1;
     const remittanceEvent1 = remittanceObject1.logs[0];
     truffleAssert.eventEmitted(remittanceObject1, "LogDeploy");
     assert.strictEqual(remittanceEvent1.args.amount.toString(),amount1.toString() , "amount is not right");
     //truffleAssert.prettyPrintEmittedEvents(deployObject1);
    });

  it("test: Using one hash two times should not work", async() => {
      //setting the amount
      const hash = await contractInstance.hash(one, web3.utils.toHex(pw1));
      const amount = toWei("1", "Gwei");
      const deadline = 23040;
      //call the contract from sender
      deployObject = await contractInstance.sendRemittance(hash, deadline , {from: sender, value: amount});
      await contractInstance.withdraw(web3.utils.toHex(pw1) , {from: one});
      await truffleAssert.fails(contractInstance.sendRemittance(hash, deadline,
           {from: sender, value: amount}));
     });

  it("test: LogWithdraw-event should be emitted | tx fee = gasUsed x gasPrice", async() => {
     //setting the amount
     const hash = await contractInstance.hash(one, web3.utils.toHex(pw1));

     const amount = toWei("1", "Gwei");
     const deadline = 23040;
     //call the contract from sender
     await contractInstance.sendRemittance(hash, deadline , {from: sender, value: amount});

     //getting the balance before withdraw
     const balanceBefore = await web3.eth.getBalance(one);

     const withdrawObject = await contractInstance.withdraw(web3.utils.toHex(pw1) , {from: one});
     const { logs } = withdrawObject;
     const withdrawEvent = withdrawObject.logs[0];
     truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
     assert.strictEqual(withdrawEvent.args.sender, one, "sender isn't right");
     assert.strictEqual(withdrawEvent.args.hash, hash, "hash problem");

     const tx = await web3.eth.getTransaction(withdrawObject.tx);
     //getting the receipt for calculating gasCost
     const receipt = withdrawObject.receipt;
     //calculating gasCost
     const gasCost = toBN(tx.gasPrice).mul(toBN(receipt.gasUsed));
     //calculating expectetbalanceafter
     const expectedBalanceAfter = toBN(balanceBefore).add(toBN(toWei("1", "Gwei"))).sub(toBN(gasCost));
     //getting the balance after withdraw
     const balanceAfter = await web3.eth.getBalance(one);
     //test if expectedBalanceAfter == balanceAfter
     assert.strictEqual(expectedBalanceAfter.toString(), balanceAfter.toString(), "Balance of one isn't right");


    });

  it("test: cancelRemittance should not be possible before deadline", async() => {
      //setting the amount
      const hash = await contractInstance.hash(one, web3.utils.toHex(pw1));
      const amount = toWei("1", "Gwei");
      const deadline = 23040;
      //call the contract from sender
      await contractInstance.sendRemittance(hash, deadline , {from: sender, value: amount});

      await truffleAssert.fails(contractInstance.cancelRemittance(hash, {from: sender}));

     });

  it("test: LogCancel-event should be emitted", async() => {
      //setting the amount
      const hash = await contractInstance.hash(one, web3.utils.toHex(pw1));
      const amount = toWei("1", "Gwei");
      const deadline = 23040;
      //call the contract from sender
      await contractInstance.sendRemittance(hash, deadline , {from: sender, value: amount});
      //console.log(web3.eth.getBlock.toString());
      await helper.advanceTime(SECONDS_IN_DAY * 11);
      await helper.advanceBlock()

      const cancelObject = await contractInstance.cancelRemittance(hash , {from: sender});
      const { logs } = cancelObject;
      const cancelEvent = cancelObject.logs[0];
      truffleAssert.eventEmitted(cancelObject, "LogCancel");
      assert.strictEqual(cancelEvent.args.sender, sender, "sender isn't right");
      assert.strictEqual(cancelEvent.args.hash, hash, "hash problem");
      assert.strictEqual(cancelEvent.args.amount.toString(),amount.toString() , "amount is not right");

     });

  it("test: should not be possible to claim remittances after withdraw", async() => {
       //setting the amount
       const hash = await contractInstance.hash(one, web3.utils.toHex(pw1));
       const amount = web3.utils.toWei("1", "Gwei");
       const deadline = 23040;
       //call the contract from sender
       await contractInstance.sendRemittance(hash, deadline , {from: sender, value: amount});
       await contractInstance.withdraw(web3.utils.toHex(pw1) , {from: one});

       //console.log(web3.eth.getBlock.toString());
       await helper.advanceTime(SECONDS_IN_DAY * 11);
       await helper.advanceBlock()
       await truffleAssert.fails(contractInstance.cancelRemittance(hash, {from: sender}));

      });

   //from https://www.npmjs.com/package/ganache-time-traveler
   // only for testing Time Travelling
  it("Test: advanceTime, it works", async() => {
       const blockBefore = await web3.eth.getBlock('latest')
       const blockNumberBefore = blockBefore.number
       const timeBefore = blockBefore.timestamp
      //console.log(timeBefore);

       await helper.advanceTime(SECONDS_IN_DAY*1000);
       //time doesn't update unless block is mined
       await helper.advanceBlock()

       const blockAfter = await web3.eth.getBlock('latest')
       const blockNumberAfter = blockAfter.number

       assert.equal(blockNumberBefore + 1, blockNumberAfter, "New block was not mined")

       const timeAfter = blockAfter.timestamp
       //console.log(timeAfter);
       assert.isBelow(timeBefore, timeAfter, "Time was not advanced")
   })


});
