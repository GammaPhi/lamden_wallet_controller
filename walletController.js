'use strict'
/** Lamden Wallet Controller 
 *  
 */
class WalletController {
    /**
     * Create a wallet controller.
     * Requires access to broswer document object when instantiated. 
     */
    constructor() {
        this.connectionRequest = undefined
        this.events = new MyEventEmitter()
        this.installed = null;
        this.locked = null;
        this.approvals = {}
        document.addEventListener('lamdenWalletInfo', (e) => {
            let data = e.detail;
            if (!data.errors){
                if (typeof data.installed !== 'undefined') this.installed = data.installed
                if (typeof data.locked !== 'undefined') this.locked = data.locked
                if (data.wallets.length > 0) this.walletAddress = data.wallets[0]
                if (typeof data.approvals !== 'undefined') this.approvals = data.approvals
            }
            this.events.emit('newInfo', e.detail)
        })
        document.addEventListener('lamdenWalletTxStatus', (e) => {
            this.events.emit('txStatus', e.detail)
        })
    }
    /**
     * Get the current wallet information
     * @fires newInfo
     */
    getInfo(){
        document.dispatchEvent(new CustomEvent('lamdenWalletGetInfo'));
    }
    /**
     * Get the current wallet information
     * @fires newInfo
     * @return {boolean} The wallet is installed
     */
    walletIsInstalled(){
        return new Promise((resolve, reject) => {
            const handleWalletInstalled = () => {
                this.installed = true;
                resolve(true);
                document.removeEventListener("lamdenWalletInfo", handleWalletInstalled);
            }
            document.addEventListener('lamdenWalletInfo', handleWalletInstalled, { once: true })
            this.getInfo();
            setTimeout(() => {
                if (!this.installed) resolve(false);
            }, 1000)
        })
    }
    /**
     * Send a connection to the Lamden Wallet for approval. Will call createConnection if it wasn't done previously.
     * @param {Object} request  - A connection request object
     * @param {string} request.appName - The name of your dApp
     * @param {string} request.description - What is yoru dApp and why should the user approve the connection
     * @param {string} request.contractName - The smart contract your dApp will transact through
     * @param {string} request.networkType - Which Lamden network the approval is for (Mainnet or testnet)
     * @param {string} request.background - A reletive path to an image to override the default lamden wallet account background
     * @param {string} request.logo - A reletive path to an image to use as a logo in the Lamden Wallet
     * @param {string} request.reapprove - Ask the user to re-approve your app
     * @param {string} request.charms.name - Charm name
     * @param {string} request.charms.variableName - Smart contract variable to pull data from
     * @param {string} request.charms.key - Key assoicated to the value you want to lookup
     * @param {string} request.charms.formatAs - What format the data is
     * @param {string} request.charms.iconPath - An icon to display along with your charm
     * @param {number} request.preApproval.stampsToPreApprove - Pre-approve transactions on this account
     * @param {string} request.preApproval.message - Tell the user why you want the pre-approval
     * @fires newInfo
     */
    sendConnection(request){
        this.connectionRequest = new WalletConnectionRequest(request)
        return new Promise((resolve) => {
            const handleConnecionResponse = (e) => {
                console.log(e)
                this.events.emit('newInfo', e.detail)
                resolve(e.detail);
                document.removeEventListener("lamdenWalletInfo", handleConnecionResponse);
            }
            document.addEventListener('lamdenWalletInfo', handleConnecionResponse, { once: true })
            document.dispatchEvent(new CustomEvent('lamdenWalletConnect', {detail: this.connectionRequest.getInfo()}));
        })
    }
    /**
     * Send a connection to the Lamden Wallet for approval. Will call createConnection if it wasn't done previously.
     * @param {Object} tx  - A connection request object
     * @param {string} request.networkType - Which Lamden network the tx is for (Mainnet or testnet)
     * @param {string} request.stampLimit - The max Stamps this tx is allowed to use. Cannot be more but can be less.
     * @param {string} request.methodName - The method on your approved smart contract to call
     * @param {Object} request.kwargs - A keyword object to supply arguments to your method
     * @fires txStatus
     */
    sendTransaction(tx){
        document.dispatchEvent(new CustomEvent('lamdenWalletSendTx', {detail: JSON.stringify(tx)}));
    }
  }
/** Wallet Connection Request
 *  
 */
class WalletConnectionRequest {
    /**
     * Validate a request object
     * @param {Object} request  - request object
     */
    constructor(request = {}) {
        const isUndefined = (value) => typeof value === "undefined";
        const populate = (request) => {
            Object.keys(request).forEach(p => {
                if (!isUndefined(this[p])) this[p] = request[p]
            })
        }
        this.request = request
        this.appName = "";
        this.description = "";
        this.contractName = "";
        this.networkType = "";
        this.logo = "";
        this.background = "";
        this.approvalHash = "";
        this.reapprove = false;
        this.newKeypair = false;
        this.charms = []
        this.preApproval = {
            stampsToPreApprove: 0, 
            message: ""
        }
        try{
            populate(request)
        }catch (e){
            console.log(e)
            throw new Error(e.message)
        }
    }
    /**
     * Get the the approval request information
     * @return {string} - JSON string of all request information
     */
    getInfo(){
        let info = {
            appName: this.appName, 
            description: this.description, 
            contractName: this.contractName, 
            networkType: this.networkType, logo: this.logo}
        if (this.background.length > 0) info.background = this.background
        if (this.charms.length > 0) info.charms = this.charms
        if (this.preApproval.stampsToPreApprove > 0) info.preApproval = this.preApproval
        if (this.reapprove == true) {
            info.reapprove = true
            if (this.newKeypair == true) {
                info.newKeypair = true
            }
        }
        return JSON.stringify(info)
    }
}

class MyEventEmitter {
    constructor() {
      this._events = {};
    }
  
    on(name, listener) {
      if (!this._events[name]) {
        this._events[name] = [];
      }
  
      this._events[name].push(listener);
    }
  
    removeListener(name, listenerToRemove) {
      if (!this._events[name]) {
        return
      }
  
      const filterListeners = (listener) => listener !== listenerToRemove;
  
      this._events[name] = this._events[name].filter(filterListeners);
    }
  
    emit(name, data) {
      if (!this._events[name]) {
        return
      }
  
      const fireCallbacks = (callback) => {
        callback(data);
      };
  
      this._events[name].forEach(fireCallbacks);
    }
  }

module.exports = WalletController;