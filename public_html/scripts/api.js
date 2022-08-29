// Use strict
"use strict";


// Classes

// API class
class Api {

	// Public
	
		// Constructor
		constructor(torProxy, node, transactions, wallets, settings, message) {
		
			// Set Tor proxy
			this.torProxy = torProxy;
		
			// Set node
			this.node = node;
			
			// Set transactions
			this.transactions = transactions;
			
			// Set wallets
			this.wallets = wallets;
			
			// Set settings
			this.settings = settings;
			
			// Set message
			this.message = message;
			
			// Set enable mining API to setting's default value
			this.enableMiningApi = Api.SETTINGS_ENABLE_MINING_API_DEFAULT_VALUE;
			
			// Set require payment proof to settings's default value
			this.requirePaymentProof = Api.SETTINGS_REQUIRE_PAYMENT_PROOF_DEFAULT_VALUE;
			
			// Set self
			var self = this;
			
			// Once database is initialized
			Database.onceInitialized(function() {
			
				// Return promise
				return new Promise(function(resolve, reject) {
				
					// Return creating settings
					return Promise.all([
			
						// Enable mining API setting
						self.settings.createValue(Api.SETTINGS_ENABLE_MINING_API_NAME, Api.SETTINGS_ENABLE_MINING_API_DEFAULT_VALUE),
						
						// Require payment proof setting
						self.settings.createValue(Api.SETTINGS_REQUIRE_PAYMENT_PROOF_NAME, Api.SETTINGS_REQUIRE_PAYMENT_PROOF_DEFAULT_VALUE)
						
					]).then(function() {
					
						// Initialize settings
						var settings = [
						
							// Enable mining API setting
							Api.SETTINGS_ENABLE_MINING_API_NAME,
							
							// Require payment proof setting
							Api.SETTINGS_REQUIRE_PAYMENT_PROOF_NAME
						];
					
						// Return getting settings' values
						return Promise.all(settings.map(function(setting) {
						
							// Return getting setting's value
							return self.settings.getValue(setting);
						
						})).then(function(settingValues) {
						
							// Set enable mining API to setting's value
							self.enableMiningApi = settingValues[settings.indexOf(Api.SETTINGS_ENABLE_MINING_API_NAME)];
							
							// Set require payment proof to setting's value
							self.requirePaymentProof = settingValues[settings.indexOf(Api.SETTINGS_REQUIRE_PAYMENT_PROOF_NAME)];
							
							// Resolve
							resolve();
						
						// Catch errors
						}).catch(function(error) {
						
							// Reject
							reject();
						});
						
					// Catch errors
					}).catch(function(error) {
					
						// Reject
						reject();
					});
				});
			});
			
			// Settings change event
			$(this.settings).on(Settings.CHANGE_EVENT, function(event, setting) {
			
				// Check what setting was changes
				switch(setting[Settings.DATABASE_SETTING_NAME]) {
				
					// Enable mining API setting
					case Api.SETTINGS_ENABLE_MINING_API_NAME:
					
						// Set enable mining API to setting's value
						self.enableMiningApi = setting[Settings.DATABASE_VALUE_NAME];
					
						// Break
						break;
					
					// Require payment proof setting
					case Api.SETTINGS_REQUIRE_PAYMENT_PROOF_NAME:
					
						// Set require payment proof to setting's value
						self.requirePaymentProof = setting[Settings.DATABASE_VALUE_NAME];
					
						// Break
						break;
				}
			});
		}
		
		// Get response
		getResponse(api, wallet, type, data, cancelOccurred = Common.NO_CANCEL_OCCURRED) {
		
			// Set self
			var self = this;
		
			// Return promise
			return new Promise(function(resolve, reject) {
			
				// Check API
				switch(api) {
				
					// Foreign API URL
					case Api.FOREIGN_API_URL:
					
						// Check if type is JSON
						if(type === "application/json") {
						
							// Try
							try {
							
								// Parse data as JSON
								data = JSONBigNumber.parse((new TextDecoder()).decode(data));
							}
							
							// Catch errors
							catch(error) {
							
								// Reject unsupported media type response
								reject(Listener.UNSUPPORTED_MEDIA_TYPE_RESPONSE);
								
								// Return
								return;
							}
							
							// Check if data is a valid JSON-RPC request
							if(JsonRpc.isRequest(data) === true) {
							
								// Check if cancel didn't occur
								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
								
									// Check data's method
									switch(data["method"]) {
									
										// Check version
										case Api.CHECK_VERSION_METHOD:
										
											// Check if parameters are provided
											if(Array.isArray(data["params"]) === true) {
											
												// Check if the correct number of parameters are provided
												if(data["params"]["length"] === Api.CHECK_VERSION_PARAMETERS_LENGTH) {
										
													// Resolve
													resolve([
													
														// JSON-RPC response
														JsonRpc.createResponse({
							
															// Ok
															"Ok": {
																
																// Foreign API version
																"foreign_api_version": Api.CURRENT_FOREIGN_API_VERSION,
																
																// Supported slate versions
																"supported_slate_versions": Slate.SUPPORTED_VERSIONS
															}
														}, data),
														
														// Method
														data["method"],
														
														// Additional data
														Api.NO_ADDITIONAL_DATA
													]);
												}
												
												// Otherwise
												else {
												
													// Reject JSON-RPC invalid parameters error response
													reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
												}
											}
											
											// Otherwise
											else {
											
												// Reject JSON-RPC invalid request error response
												reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_REQUEST_ERROR, data));
											}
										
											// Break
											break;
										
										// Build coinbase
										case Api.BUILD_COINBASE_METHOD:
										
											// Check if mining API is enabled
											if(self.enableMiningApi === true) {
										
												// Check if parameters are provided
												if(Object.isObject(data["params"]) === true) {
												
													// Check if block fees parameter is invalid
													if("block_fees" in data["params"] === false || Object.isObject(data["params"]["block_fees"]) === false) {
													
														// Reject JSON-RPC invalid parameters error response
														reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
													}
													
													// Otherwise check if fees parameter is invalid
													else if("fees" in data["params"]["block_fees"] === false || (Common.isNumberString(data["params"]["block_fees"]["fees"]) === false && data["params"]["block_fees"]["fees"] instanceof BigNumber === false) || (new BigNumber(data["params"]["block_fees"]["fees"])).isInteger() === false || (new BigNumber(data["params"]["block_fees"]["fees"])).isNegative() === true) {
													
														// Reject JSON-RPC invalid parameters error response
														reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
													}
													
													// Otherwise check if height parameter is invalid
													else if("height" in data["params"]["block_fees"] === false || (Common.isNumberString(data["params"]["block_fees"]["height"]) === false && data["params"]["block_fees"]["height"] instanceof BigNumber === false) || (new BigNumber(data["params"]["block_fees"]["height"])).isInteger() === false || (new BigNumber(data["params"]["block_fees"]["height"])).isLessThan(Consensus.FIRST_BLOCK_HEIGHT) === true) {
													
														// Reject JSON-RPC invalid parameters error response
														reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
													}
													
													// Otherwise check if key ID parameter is invalid
													else if("key_id" in data["params"]["block_fees"] === false || (data["params"]["block_fees"]["key_id"] !== Common.JSON_NULL_VALUE && (Common.isHexString(data["params"]["block_fees"]["key_id"]) === false || Common.hexStringLength(data["params"]["block_fees"]["key_id"]) !== Identifier.LENGTH))) {
													
														// Reject JSON-RPC invalid parameters error response
														reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
													}
													
													// Otherwise
													else {
													
														// Get fees from parameters
														var fees = new BigNumber(data["params"]["block_fees"]["fees"]);
														
														// Get height from parameters
														var height = new BigNumber(data["params"]["block_fees"]["height"]);
														
														// Get key ID from parameters
														var keyId = data["params"]["block_fees"]["key_id"];
														
														// Try
														try {
														
															// Create identifier from key ID or set it to no identifer it not available
															var identifier = (keyId !== Common.JSON_NULL_VALUE) ? new Identifier(keyId) : Identifier.NO_IDENTIFIER;
														}
														
														// Catch errors
														catch(error) {
														
															// Reject JSON-RPC invalid parameters error response
															reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
															
															// Return
															return;
														}
														
														// Get coinbase
														var getCoinbase = function() {
														
															// Return promise
															return new Promise(function(resolve, reject) {
															
																// Check if cancel didn't occur
																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
															
																	// Build coinbase
																	var buildCoinbase = function() {
																	
																		// Return promise
																		return new Promise(function(resolve, reject) {
																		
																			// Check if cancel didn't occur
																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																		
																				// Get using provided identifier
																				var usingProvidedIdentifier = identifier !== Identifier.NO_IDENTIFIER && wallet.getLastIdentifier().includesValue(identifier) === true;
																			
																				// Return wallet building coinbase
																				return wallet.buildCoinbase(fees, height, identifier, (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue mining.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue mining.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function(coinbase) {
																				
																					// Check if cancel didn't occur
																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																				
																						// Check if using provided identifier
																						if(usingProvidedIdentifier === true) {
																						
																							// Resolve coinbase
																							resolve(coinbase);
																						}
																						
																						// Otherwise
																						else {
																					
																							// Return getting a transaction with the coinbase's commit
																							return self.transactions.getTransaction(wallet.getWalletType(), wallet.getNetworkType(), coinbase[Wallet.COINBASE_COMMIT_INDEX]).then(function(transaction) {
																							
																								// Check if cancel didn't occur
																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																							
																									// Check if a transaction with the same commit doesn't exist
																									if(transaction === Transactions.NO_TRANSACTION_FOUND) {
																							
																										// Resolve coinbase
																										resolve(coinbase);
																									}
																									
																									// Otherwise
																									else {
																									
																										// Return building coinbase
																										return buildCoinbase().then(function(coinbase) {
																										
																											// Check if cancel didn't occur
																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																										
																												// Resolve coinbase
																												resolve(coinbase);
																											}
																			
																											// Otherwise
																											else {
																											
																												// Reject JSON-RPC internal error error response
																												reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																											}
																										
																										// Catch errors
																										}).catch(function(error) {
																										
																											// Check if cancel didn't occur
																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																										
																												// Reject error
																												reject(error);
																											}
																			
																											// Otherwise
																											else {
																											
																												// Reject JSON-RPC internal error error response
																												reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																											}
																										});
																									}
																								}
																			
																								// Otherwise
																								else {
																								
																									// Reject JSON-RPC internal error error response
																									reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																								}
																								
																							// Catch errors
																							}).catch(function(error) {
																							
																								// Reject JSON-RPC internal error error response
																								reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																							});
																						}
																					}
																			
																					// Otherwise
																					else {
																					
																						// Reject JSON-RPC internal error error response
																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																					}
																				
																				// Catch errors
																				}).catch(function(error) {
																				
																					// Check if cancel didn't occur
																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																				
																						// Check if hardware wallet was disconnected
																						if(error === HardwareWallet.DISCONNECTED_ERROR) {
																						
																							// Check if wallet's hardware wallet is connected
																							if(wallet.isHardwareConnected() === true) {
																						
																								// Wallet's hardware wallet disconnect event
																								$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																							
																									// Return getting coinbase
																									return getCoinbase().then(function(coinbase) {
																									
																										// Check if cancel didn't occur
																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																									
																											// Resolve coinbase
																											resolve(coinbase);
																										}
																										
																										// Otherwise
																										else {
																										
																											// Reject JSON-RPC internal error error response
																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																										}
																									
																									// Catch errors
																									}).catch(function(error) {
																									
																										// Check if cancel didn't occur
																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																									
																											// Reject error
																											reject(error);
																										}
																										
																										// Otherwise
																										else {
																										
																											// Reject JSON-RPC internal error error response
																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																										}
																									});
																								});
																							}
																							
																							// Otherwise
																							else {
																							
																								// Return getting coinbase
																								return getCoinbase().then(function(coinbase) {
																								
																									// Check if cancel didn't occur
																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																								
																										// Resolve coinbase
																										resolve(coinbase);
																									}
																									
																									// Otherwise
																									else {
																									
																										// Reject JSON-RPC internal error error response
																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																									}
																								
																								// Catch errors
																								}).catch(function(error) {
																								
																									// Check if cancel didn't occur
																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																								
																										// Reject error
																										reject(error);
																									}
																									
																									// Otherwise
																									else {
																									
																										// Reject JSON-RPC internal error error response
																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																									}
																								});
																							}
																						}
																						
																						// Otherwise
																						else {
																					
																							// Reject JSON-RPC internal error error response
																							reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																						}
																					}
																					
																					// Otherwise
																					else {
																					
																						// Reject JSON-RPC internal error error response
																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																					}
																				});
																			}
																			
																			// Otherwise
																			else {
																			
																				// Reject JSON-RPC internal error error response
																				reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																			}
																		});
																	};
																
																	// Check if wallet isn't a hardware wallet
																	if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																	
																		// Return building a coinbase
																		return buildCoinbase().then(function(coinbase) {
																		
																			// Check if cancel didn't occur
																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																		
																				// Resolve coinbase
																				resolve(coinbase);
																			}
																			
																			// Otherwise
																			else {
																			
																				// Reject JSON-RPC internal error error response
																				reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																			}
																		
																		// Catch errors
																		}).catch(function(error) {
																		
																			// Check if cancel didn't occur
																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																		
																				// Reject error
																				reject(error);
																			}
																			
																			// Otherwise
																			else {
																			
																				// Reject JSON-RPC internal error error response
																				reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																			}
																		});
																	}
																	
																	// Otherwise
																	else {
																
																		// Return waiting for wallet's hardware wallet to connect
																		return self.wallets.waitForHardwareWalletToConnect(wallet.getKeyPath(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Connect the hardware wallet for Wallet %1$s to continue mining.') : Language.getDefaultTranslation('Connect the hardware wallet for %1$y to continue mining.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function() {
																		
																			// Check if cancel didn't occur
																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																		
																				// Return building a coinbase
																				return buildCoinbase().then(function(coinbase) {
																				
																					// Check if cancel didn't occur
																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																				
																						// Resolve coinbase
																						resolve(coinbase);
																					}
																			
																					// Otherwise
																					else {
																					
																						// Reject JSON-RPC internal error error response
																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																					}
																				
																				// Catch errors
																				}).catch(function(error) {
																				
																					// Check if cancel didn't occur
																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																				
																						// Reject error
																						reject(error);
																					}
																			
																					// Otherwise
																					else {
																					
																						// Reject JSON-RPC internal error error response
																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																					}
																				});
																			}
																			
																			// Otherwise
																			else {
																			
																				// Reject JSON-RPC internal error error response
																				reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																			}
																			
																		// Catch errors
																		}).catch(function(error) {
																		
																			// Reject JSON-RPC internal error error response
																			reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																		});
																	}
																}
																			
																// Otherwise
																else {
																
																	// Reject JSON-RPC internal error error response
																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																}
															});
														};
												
														// Return getting coinbase
														return getCoinbase().then(function(coinbase) {
														
															// Check if cancel didn't occur
															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
														
																// Try
																try {
																
																	// Create kernel
																	var kernel = new SlateKernel(SlateKernel.COINBASE_FEATURES, new BigNumber(0), Slate.NO_LOCK_HEIGHT, Slate.NO_RELATIVE_HEIGHT, coinbase[Wallet.COINBASE_EXCESS_INDEX], coinbase[Wallet.COINBASE_EXCESS_SIGNATURE_INDEX]);
																	
																	// Create output
																	var output = new SlateOutput(SlateOutput.COINBASE_FEATURES, coinbase[Wallet.COINBASE_COMMIT_INDEX], coinbase[Wallet.COINBASE_PROOF_INDEX]);
																}
																
																// Catch errors
																catch(error) {
																
																	// Reject JSON-RPC internal error error response
																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																	
																	// Return
																	return;
																}
																
																// Try
																try {
																
																	// Resolve
																	resolve([
																	
																		// JSON-RPC response
																		JsonRpc.createResponse({
											
																			// Ok
																			"Ok": {
																			
																				// Key ID
																				"key_id": Common.toHexString(coinbase[Wallet.COINBASE_IDENTIFIER_INDEX].getValue()),
																				
																				// Output
																				"output": output.serialize(Api.COINBASE_SLATE_VERSION),
																				
																				// Kernel
																				"kernel": kernel.serialize(Api.COINBASE_SLATE_VERSION)
																			}
																		}, data),
																	
																		// Method
																		data["method"],
																		
																		// Additional data
																		Api.NO_ADDITIONAL_DATA
																	]);
																}
																
																// Catch errors
																catch(error) {
																
																	// Reject JSON-RPC internal error error response
																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																}
															}
																			
															// Otherwise
															else {
															
																// Reject JSON-RPC internal error error response
																reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
															}
															
														// Catch errors
														}).catch(function(error) {
														
															// Check if cancel didn't occur
															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
														
																// Reject error
																reject(error);
															}
																			
															// Otherwise
															else {
															
																// Reject JSON-RPC internal error error response
																reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
															}
														});
													}
												}
												
												// Otherwise
												else {
												
													// Reject JSON-RPC invalid request error response
													reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_REQUEST_ERROR, data));
												}
											}
											
											// Otherwise
											else {
											
												// Reject JSON-RPC method not found error response
												reject(JsonRpc.createErrorResponse(JsonRpc.METHOD_NOT_FOUND_ERROR, data));
											}
										
											// Break
											break;
										
										// Receive transaction
										case Api.RECEIVE_TRANSACTION_METHOD:
										
											// Check if parameters are provided
											if(Array.isArray(data["params"]) === true) {
											
												// Check if the correct number of parameters are provided
												if(data["params"]["length"] === Api.RECEIVE_TRANSACTION_PARAMETERS_LENGTH) {
												
													// Decode slate
													var decodeSlate = function(serializedSlateOrSlatepack) {
													
														// Return promise
														return new Promise(function(resolve, reject) {
														
															// Check if cancel didn't occur
															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
															
																// Check if a Slatepack is provided
																if(typeof serializedSlateOrSlatepack === "string") {
																
																	// Check wallet type
																	switch(Consensus.getWalletType()) {
																	
																		// MWC wallet
																		case Consensus.MWC_WALLET_TYPE:
																
																			// Get Slatepack
																			var slatepack = serializedSlateOrSlatepack;
																			
																			// Check if Slatepack is encrypted
																			if(Slatepack.isEncryptedSlatepack(slatepack) === true) {
																		
																				// Check if wallet isn't a hardware wallet
																				if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																			
																					// Return getting wallet's Tor secret key
																					return wallet.getAddressKey(Wallet.PAYMENT_PROOF_TOR_ADDRESS_KEY_INDEX).then(function(secretKey) {
																					
																						// Check if cancel didn't occur
																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																						
																							// Return decoding the Slatepack
																							return Slatepack.decodeSlatepack(slatepack, secretKey).then(function(slate) {
																							
																								// Securely clear secret key
																								secretKey.fill(0);
																								
																								// Check if cancel didn't occur
																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																								
																									// Resolve the slate
																									resolve(slate);
																								}
																								
																								// Otherwise
																								else {
																								
																									// Reject JSON-RPC internal error error response
																									reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																								}
																							
																							// Catch errors
																							}).catch(function(error) {
																							
																								// Securely clear secret key
																								secretKey.fill(0);
																								
																								// Check if cancel didn't occur
																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																								
																									// Reject JSON-RPC invalid parameters error response
																									reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																								}
																								
																								// Otherwise
																								else {
																								
																									// Reject JSON-RPC internal error error response
																									reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																								}
																							});
																						}
																						
																						// Otherwise
																						else {
																						
																							// Securely clear secret key
																							secretKey.fill(0);
																						
																							// Reject JSON-RPC internal error error response
																							reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																						}
																					
																					// Catch errors
																					}).catch(function(error) {
																					
																						// Reject JSON-RPC internal error error response
																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																					});
																				}
																				
																				// Otherwise
																				else {
																				
																					// Return waiting for wallet's hardware wallet to connect
																					return self.wallets.waitForHardwareWalletToConnect(wallet.getKeyPath(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Connect the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Connect the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function() {
																					
																						// Check if cancel didn't occur
																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																				
																							// Check if hardware wallet is connected
																							if(wallet.isHardwareConnected() === true) {
																							
																								// Return decoding the Slatepack
																								return Slatepack.decodeSlatepack(slatepack, wallet.getHardwareWallet(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function(slate) {
																								
																									// Check if cancel didn't occur
																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																								
																										// Resolve the slate
																										resolve(slate);
																									}
																									
																									// Otherwise
																									else {
																									
																										// Reject JSON-RPC internal error error response
																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																									}
																									
																								// Catch errors
																								}).catch(function(error) {
																								
																									// Check if cancel didn't occur
																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																								
																										// Check if hardware wallet was disconnected
																										if(error === HardwareWallet.DISCONNECTED_ERROR) {
																										
																											// Check if wallet's hardware wallet is connected
																											if(wallet.isHardwareConnected() === true) {
																										
																												// Wallet's hardware wallet disconnect event
																												$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																											
																													// Return decoding the Slatepack
																													return decodeSlate(slatepack).then(function(slate) {
																													
																														// Check if cancel didn't occur
																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																													
																															// Resolve slate
																															resolve(slate);
																														}
																														
																														// Otherwise
																														else {
																														
																															// Reject JSON-RPC internal error error response
																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																														}
																													
																													// Catch errors
																													}).catch(function(error) {
																													
																														// Check if cancel didn't occur
																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																													
																															// Reject error
																															reject(error);
																														}
																														
																														// Otherwise
																														else {
																														
																															// Reject JSON-RPC internal error error response
																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																														}
																													});
																												});
																											}
																											
																											// Otherwise
																											else {
																											
																												// Return decoding the Slatepack
																												return decodeSlate(slatepack).then(function(slate) {
																												
																													// Check if cancel didn't occur
																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																												
																														// Resolve slate
																														resolve(slate);
																													}
																													
																													// Otherwise
																													else {
																													
																														// Reject JSON-RPC internal error error response
																														reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																													}
																												
																												// Catch errors
																												}).catch(function(error) {
																												
																													// Check if cancel didn't occur
																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																												
																														// Reject error
																														reject(error);
																													}
																													
																													// Otherwise
																													else {
																													
																														// Reject JSON-RPC internal error error response
																														reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																													}
																												});
																											}
																										}
																										
																										// Otherwise
																										else {
																									
																											// Reject JSON-RPC invalid parameters error response
																											reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																										}
																									}
																									
																									// Otherwise
																									else {
																									
																										// Reject JSON-RPC internal error error response
																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																									}
																								});
																							}
																							
																							// Otherwise
																							else {
																							
																								// Return decoding the Slatepack
																								return decodeSlate(slatepack).then(function(slate) {
																								
																									// Check if cancel didn't occur
																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																								
																										// Resolve slate
																										resolve(slate);
																									}
																									
																									// Otherwise
																									else {
																									
																										// Reject JSON-RPC internal error error response
																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																									}
																								
																								// Catch errors
																								}).catch(function(error) {
																								
																									// Check if cancel didn't occur
																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																								
																										// Reject error
																										reject(error);
																									}
																									
																									// Otherwise
																									else {
																									
																										// Reject JSON-RPC internal error error response
																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																									}
																								});
																							}
																						}
																													
																						// Otherwise
																						else {
																						
																							// Reject JSON-RPC internal error error response
																							reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																						}
																						
																					// Catch errors
																					}).catch(function(error) {
																					
																						// Reject JSON-RPC internal error error response
																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																					});
																				}
																			}
																			
																			// Otherwise
																			else {
																			
																				// Return decoding the Slatepack
																				return Slatepack.decodeSlatepack(slatepack).then(function(slate) {
																				
																					// Check if cancel didn't occur
																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																					
																						// Resolve the slate
																						resolve(slate);
																					}
																					
																					// Otherwise
																					else {
																					
																						// Reject JSON-RPC internal error error response
																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																					}
																				
																				// Catch errors
																				}).catch(function(error) {
																				
																					// Check if cancel didn't occur
																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																					
																						// Reject JSON-RPC invalid parameters error response
																						reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																					}
																					
																					// Otherwise
																					else {
																					
																						// Reject JSON-RPC internal error error response
																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																					}
																				});
																			}
																			
																			// Break
																			break;
																			
																		// GRIN wallet
																		case Consensus.GRIN_WALLET_TYPE:
																		
																			// Reject JSON-RPC internal error error response
																			reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																			
																			// Break
																			break;
																	}
																}
																
																// Otherwise check if a serialized slate is provided
																else if(Object.isObject(serializedSlateOrSlatepack) === true) {
																
																	// Get slate
																	var slate = serializedSlateOrSlatepack;
																
																	// Resolve the slate
																	resolve(slate);
																}
															
																// Otherwise
																else {
																
																	// Reject JSON-RPC internal error error response
																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																}
															}
															
															// Otherwise
															else {
															
																// Reject JSON-RPC internal error error response
																reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
															}
														});
													};
													
													// Return decoding slate
													return decodeSlate(data["params"][Api.RECEIVE_TRANSACTION_SLATE_PARAMETER_INDEX]).then(function(decodedSlate) {
													
														// Check if cancel didn't occur
														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
														
															// Return parsing decoded slate as a slate
															return Slate.parseSlateAsynchronous(decodedSlate, wallet.getNetworkType() === Consensus.MAINNET_NETWORK_TYPE, Slate.COMPACT_SLATE_PURPOSE_SEND_INITIAL).then(function(slate) {
															
																// Check if cancel didn't occur
																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																
																	// Check if there's not the expected number of slate participants
																	if(slate.getNumberOfParticipants().isEqualTo(Api.RECEIVE_TRANSACTION_EXPECTED_NUMBER_OF_SLATE_PARTICIPANTS) === false) {
																	
																		// Reject JSON-RPC invalid parameters error response
																		reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																	}
																	
																	// Check if there's no room to add another participant to the slate
																	else if(slate.getNumberOfParticipants().isLessThanOrEqualTo(slate.getParticipants()["length"]) === true) {
																	
																		// Reject JSON-RPC invalid parameters error response
																		reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																	}
																	
																	// Check if slate's sender participant doesn't exist
																	else if(slate.getParticipant(SlateParticipant.SENDER_ID) === Slate.NO_PARTICIPANT) {
																	
																		// Reject JSON-RPC invalid parameters error response
																		reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																	}
																	
																	// Otherwise check if slate's sender participant is already complete
																	else if(slate.getParticipant(SlateParticipant.SENDER_ID).isComplete() === true) {
																	
																		// Reject JSON-RPC invalid parameters error response
																		reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																	}
																	
																	// Otherwise check if there's not the expected number of slate kernels
																	else if(slate.getKernels()["length"] !== Api.RECEIVE_TRANSACTION_EXPECTED_NUMBER_OF_SLATE_KERNELS) {
																	
																		// Reject JSON-RPC invalid parameters error response
																		reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																	}
																	
																	// Otherwise check if slate's kernel is already complete
																	else if(slate.getKernels()[0].isComplete() === true) {
																	
																		// Reject JSON-RPC invalid parameters error response
																		reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																	}
																	
																	// Check if slate already has a receiver signature
																	else if(slate.getReceiverSignature() !== Slate.NO_RECEIVER_SIGNATURE) {
																	
																		// Reject JSON-RPC invalid parameters error response
																		reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																	}
																	
																	// Otherwise check if payment proof is required and the slate doesn't have a payment proof
																	else if(self.requirePaymentProof === true && slate.hasPaymentProof() === false) {
																	
																		// Reject JSON-RPC invalid parameters error response
																		reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																	}
																	
																	// Otherwise
																	else {
																	
																		// Check if a Slatepack is provided, the Slatepack is encrypted, and the slate contains a payment proof
																		if(typeof data["params"][Api.RECEIVE_TRANSACTION_SLATE_PARAMETER_INDEX] === "string" && Slatepack.isEncryptedSlatepack(data["params"][Api.RECEIVE_TRANSACTION_SLATE_PARAMETER_INDEX]) === true && slate.hasPaymentProof() === true) {
																		
																			// Check if slate's sender address length
																			switch(slate.getSenderAddress()["length"]) {
																			
																				// MQS address length
																				case Mqs.ADDRESS_LENGTH:
																					
																					// Break
																					break;
																				
																				// Tor address length
																				case Tor.ADDRESS_LENGTH:
																				
																					// Check if sender address isn't for the Slatepack's sender public key
																					if(slate.getSenderAddress() !== Tor.publicKeyToTorAddress(Slatepack.getSlatepackSenderPublicKey(data["params"][Api.RECEIVE_TRANSACTION_SLATE_PARAMETER_INDEX]))) {
																					
																						// Reject JSON-RPC invalid parameters error response
																						reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																						
																						// Return
																						return;
																					}
																					
																					// Break
																					break;
																				
																				// Default
																				default:
																				
																					// Reject JSON-RPC invalid parameters error response
																					reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																					
																					// Return
																					return;
																			}
																			
																			// Check if slate's receiver address length
																			switch(slate.getReceiverAddress()["length"]) {
																			
																				// MQS address length
																				case Mqs.ADDRESS_LENGTH:
																				
																					// Break
																					break;
																				
																				// Tor address length
																				case Tor.ADDRESS_LENGTH:
																				
																					// Check if receiver address isn't for the Slatepack's receiver public key
																					if(slate.getReceiverAddress() !== Tor.publicKeyToTorAddress(Slatepack.getSlatepackReceiverPublicKey(data["params"][Api.RECEIVE_TRANSACTION_SLATE_PARAMETER_INDEX]))) {
																					
																						// Reject JSON-RPC invalid parameters error response
																						reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																						
																						// Return
																						return;
																					}
																					
																					// Break
																					break;
																				
																				// Default
																				default:
																				
																					// Reject JSON-RPC invalid parameters error response
																					reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																					
																					// Return
																					return;
																			}
																		}
																		
																		// Get current height
																		var currentHeight = self.node.getCurrentHeight().getHeight();
																		
																		// Check if slate's time to live cut off height exists and is expired
																		if(slate.getTimeToLiveCutOffHeight() !== Slate.NO_TIME_TO_LIVE_CUT_OFF_HEIGHT && currentHeight !== Node.UNKNOWN_HEIGHT && currentHeight.isEqualTo(Consensus.FIRST_BLOCK_HEIGHT) === false && slate.getTimeToLiveCutOffHeight().isLessThanOrEqualTo(currentHeight) === true) {
																	
																			// Reject JSON-RPC invalid parameters error response
																			reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																		}
																		
																		// Otherwise
																		else {
																	
																			// Return getting a transaction for the wallet with the same ID
																			return self.transactions.getWalletsTransactionWithId(wallet.getKeyPath(), slate.getId()).then(function(transaction) {
																			
																				// Check if cancel didn't occur
																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																			
																					// Check if a transaction for the wallet with the same ID doesn't exist
																					if(transaction === Transactions.NO_TRANSACTION_FOUND) {
																					
																						// Is kernel offset unique
																						var isKernelOffsetUnique = function() {
																						
																							// Return promise
																							return new Promise(function(resolve, reject) {
																							
																								// Check if cancel didn't occur
																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																								
																									// Check if slate is compact
																									if(slate.isCompact() === true) {
																									
																										// Create slate offset
																										slate.createOffset();
																									}
																									
																									// Try
																									try {
																									
																										// Get slate's kernel offset
																										var kernelOffset = slate.getOffsetExcess();
																									}
																									
																									// Catch errors
																									catch(error) {
																									
																										// Reject JSON-RPC internal error error response
																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																										
																										// Return
																										return;
																									}
																								
																									// Return getting a received transaction for the wallet with the kernel offset
																									return self.transactions.getWalletsReceivedTransactionWithKernelOffset(wallet.getKeyPath(), kernelOffset).then(function(transaction) {
																									
																										// Check if cancel didn't occur
																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																									
																											// Check if a received transaction for the wallet with the same kernel offset doesn't exist
																											if(transaction === Transactions.NO_TRANSACTION_FOUND) {
																											
																												// Resolve true
																												resolve(true);
																											}
																											
																											// Otherwise
																											else {
																											
																												// Check if slate is compact
																												if(slate.isCompact() === true) {
																												
																													// Return getting if the slate's kernel offset is unique
																													return isKernelOffsetUnique().then(function(result) {
																													
																														// Check if cancel didn't occur
																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																														
																															// Resolve result
																															resolve(result);
																														}
																							
																														// Otherwise
																														else {
																														
																															// Reject JSON-RPC internal error error response
																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																														}
																													
																													// Catch errors
																													}).catch(function(error) {
																													
																														// Reject JSON-RPC internal error error response
																														reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																													});
																												}
																												
																												// Otherwise
																												else {
																											
																													// Resolve false
																													resolve(false);
																												}
																											}
																										}
																							
																										// Otherwise
																										else {
																										
																											// Reject JSON-RPC internal error error response
																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																										}
																									
																									// Catch errors
																									}).catch(function(error) {
																									
																										// Reject JSON-RPC internal error error response
																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																									});
																								}
																								
																								// Otherwise
																								else {
																								
																									// Reject JSON-RPC internal error error response
																									reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																								}
																							});
																						};
																						
																						// Return getting if the slate's kernel offset is unique
																						return isKernelOffsetUnique().then(function(isUnique) {
																						
																							// Check if cancel didn't occur
																							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																						
																								// Check if a the slate's kernel offset is unique
																								if(isUnique === true) {
																								
																									// Get output
																									var getOutput = function() {
																									
																										// Return promise
																										return new Promise(function(resolve, reject) {
																										
																											// Check if cancel didn't occur
																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																								
																												// Build output
																												var buildOutput = function() {
																												
																													// Return promise
																													return new Promise(function(resolve, reject) {
																													
																														// Check if cancel didn't occur
																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																														
																															// Check if slate has a lock height and its height doesn't exist or is less than or equal to its lock height
																															if(slate.getLockHeight().isEqualTo(Slate.NO_LOCK_HEIGHT) === false && (slate.getHeight() === Slate.UNKNOWN_HEIGHT || slate.getLockHeight().isGreaterThan(slate.getHeight()) === true)) {
																															
																																// Set output height to the current height if it exists and it greater than the slate's lock height or set it to the slate's lock height otherwise
																																var outputHeight = (currentHeight !== Node.UNKNOWN_HEIGHT && currentHeight.isEqualTo(Consensus.FIRST_BLOCK_HEIGHT) === false && currentHeight.isGreaterThan(slate.getLockHeight()) === true) ? currentHeight : slate.getLockHeight();
																															}
																															
																															// Otherwise
																															else {
																															
																																// Set output height to the current height if it exists or the slate's height otherwise
																																var outputHeight = (currentHeight !== Node.UNKNOWN_HEIGHT && currentHeight.isEqualTo(Consensus.FIRST_BLOCK_HEIGHT) === false) ? currentHeight : slate.getHeight();
																															}
																														
																															// Return wallet building output
																															return wallet.buildOutput(slate.getAmount(), outputHeight, HardwareWallet.RECEIVING_TRANSACTION_MESSAGE, (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function(output) {
																															
																																// Check if cancel didn't occur
																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																															
																																	// Return getting a transaction with the output's commit
																																	return self.transactions.getTransaction(wallet.getWalletType(), wallet.getNetworkType(), output[Wallet.OUTPUT_COMMIT_INDEX]).then(function(transaction) {
																																	
																																		// Check if cancel didn't occur
																																		if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																	
																																			// Check if a transaction with the same commit doesn't exist
																																			if(transaction === Transactions.NO_TRANSACTION_FOUND) {
																																	
																																				// Resolve output
																																				resolve(output);
																																			}
																																			
																																			// Otherwise
																																			else {
																																			
																																				// Return building output
																																				return buildOutput().then(function(output) {
																																				
																																					// Check if cancel didn't occur
																																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																				
																																						// Resolve output
																																						resolve(output);
																																					}
																																
																																					// Otherwise
																																					else {
																																					
																																						// Reject JSON-RPC internal error error response
																																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																					}
																																				
																																				// Catch errors
																																				}).catch(function(error) {
																																				
																																					// Check if cancel didn't occur
																																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																				
																																						// Reject error
																																						reject(error);
																																					}
																																
																																					// Otherwise
																																					else {
																																					
																																						// Reject JSON-RPC internal error error response
																																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																					}
																																				});
																																			}
																																		}
																																
																																		// Otherwise
																																		else {
																																		
																																			// Reject JSON-RPC internal error error response
																																			reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																		}
																																		
																																	// Catch errors
																																	}).catch(function(error) {
																																	
																																		// Reject JSON-RPC internal error error response
																																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																	});
																																}
																																
																																// Otherwise
																																else {
																																
																																	// Reject JSON-RPC internal error error response
																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																}
																															
																															// Catch errors
																															}).catch(function(error) {
																															
																																// Check if cancel didn't occur
																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																															
																																	// Check if hardware wallet was disconnected
																																	if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																	
																																		// Check if wallet's hardware wallet is connected
																																		if(wallet.isHardwareConnected() === true) {
																																	
																																			// Wallet's hardware wallet disconnect event
																																			$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																		
																																				// Return getting output
																																				return getOutput().then(function(output) {
																																				
																																					// Check if cancel didn't occur
																																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																				
																																						// Resolve output
																																						resolve(output);
																																					}
																																					
																																					// Otherwise
																																					else {
																																					
																																						// Reject JSON-RPC internal error error response
																																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																					}
																																				
																																				// Catch errors
																																				}).catch(function(error) {
																																				
																																					// Check if cancel didn't occur
																																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																				
																																						// Reject error
																																						reject(error);
																																					}
																																					
																																					// Otherwise
																																					else {
																																					
																																						// Reject JSON-RPC internal error error response
																																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																					}
																																				});
																																			});
																																		}
																																		
																																		// Otherwise
																																		else {
																																		
																																			// Return getting output
																																			return getOutput().then(function(output) {
																																			
																																				// Check if cancel didn't occur
																																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																			
																																					// Resolve output
																																					resolve(output);
																																				}
																																				
																																				// Otherwise
																																				else {
																																				
																																					// Reject JSON-RPC internal error error response
																																					reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																				}
																																			
																																			// Catch errors
																																			}).catch(function(error) {
																																			
																																				// Check if cancel didn't occur
																																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																			
																																					// Reject error
																																					reject(error);
																																				}
																																				
																																				// Otherwise
																																				else {
																																				
																																					// Reject JSON-RPC internal error error response
																																					reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																				}
																																			});
																																		}
																																	}
																																	
																																	// Otherwise
																																	else {
																																
																																		// Reject JSON-RPC internal error error response
																																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																	}
																																}
																																
																																// Otherwise
																																else {
																																
																																	// Reject JSON-RPC internal error error response
																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																}
																															});
																														}
																														
																														// Otherwise
																														else {
																														
																															// Reject JSON-RPC internal error error response
																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																														}
																													});
																												};
																												
																												// Check if wallet isn't a hardware wallet
																												if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																												
																													// Return building output
																													return buildOutput().then(function(output) {
																													
																														// Check if cancel didn't occur
																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																													
																															// Resolve output
																															resolve(output);
																														}
																														
																														// Otherwise
																														else {
																														
																															// Reject JSON-RPC internal error error response
																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																														}
																													
																													// Catch errors
																													}).catch(function(error) {
																													
																														// Check if cancel didn't occur
																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																														
																															// Reject error
																															reject(error);
																														}
																														
																														// Otherwise
																														else {
																														
																															// Reject JSON-RPC internal error error response
																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																														}
																													});
																												}
																												
																												// Otherwise
																												else {
																												
																													// Return waiting for wallet's hardware wallet to connect
																													return self.wallets.waitForHardwareWalletToConnect(wallet.getKeyPath(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Connect the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Connect the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function() {
																													
																														// Check if cancel didn't occur
																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																													
																															// Return building output
																															return buildOutput().then(function(output) {
																															
																																// Check if cancel didn't occur
																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																															
																																	// Resolve output
																																	resolve(output);
																																}
																														
																																// Otherwise
																																else {
																																
																																	// Reject JSON-RPC internal error error response
																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																}
																															
																															// Catch errors
																															}).catch(function(error) {
																															
																																// Check if cancel didn't occur
																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																															
																																	// Reject error
																																	reject(error);
																																}
																														
																																// Otherwise
																																else {
																																
																																	// Reject JSON-RPC internal error error response
																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																}
																															});
																														}
																														
																														// Otherwise
																														else {
																														
																															// Reject JSON-RPC internal error error response
																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																														}
																														
																													// Catch errors
																													}).catch(function(error) {
																													
																														// Reject JSON-RPC internal error error response
																														reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																													});
																												}
																											}
																											
																											// Otherwise
																											else {
																											
																												// Reject JSON-RPC internal error error response
																												reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																											}
																										});
																									};
																									
																									// Return getting output
																									return getOutput().then(function(output) {
																									
																										// Check if cancel didn't occur
																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																									
																											// Try
																											try {
																										
																												// Create a slate output from the output
																												var slateOutput = new SlateOutput(output[Wallet.OUTPUT_FEATURES_INDEX], output[Wallet.OUTPUT_COMMIT_INDEX], output[Wallet.OUTPUT_PROOF_INDEX]);
																											}
																											
																											// Catch errors
																											catch(error) {
																											
																												// Reject JSON-RPC internal error error response
																												reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																												
																												// Return
																												return;
																											}
																											
																											// Return adding output to slate
																											return Slate.addOutputsAsynchronous(slate, [slateOutput]).then(function(slate) {
																											
																												// Check if cancel didn't occur
																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																											
																													// Add slate participant
																													var addSlateParticipant = function() {
																													
																														// Return promise
																														return new Promise(function(resolve, reject) {
																														
																															// Check if cancel didn't occur
																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																														
																																// Check if wallet isn't a hardware wallet
																																if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																																
																																	// Get secret key
																																	var getSecretKey = function() {
																																	
																																		// Return promise
																																		return new Promise(function(resolve, reject) {
																																		
																																			// Check if cancel didn't occur
																																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																			
																																				// Return getting sum from wallet's sum
																																				return wallet.getSum(
																																				
																																					// Outputs
																																					[output],
																																					
																																					// Inputs
																																					[]
																																				
																																				).then(function(sum) {
																																				
																																					// Check if cancel didn't occur
																																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																					
																																						// Check if slate is compact
																																						if(slate.isCompact() === true) {
																																						
																																							// Return applying offset to slate
																																							return slate.applyOffset(sum).then(function(offset) {
																																							
																																								// Check if cancel didn't occur
																																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																								
																																									// Securely clear sum
																																									sum.fill(0);
																																									
																																									// Resolve offset
																																									resolve(offset);
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Securely clear sum and offset
																																									sum.fill(0);
																																									offset.fill(0);
																																								
																																									// Reject JSON-RPC internal error error response
																																									reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																								}
																																								
																																							// Catch errors
																																							}).catch(function(error) {
																																							
																																								// Securely clear sum
																																								sum.fill(0);
																																							
																																								// Reject JSON-RPC internal error error response
																																								reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																							});
																																						}
																																						
																																						// Otherwise
																																						else {
																																					
																																							// Resolve sum
																																							resolve(sum);
																																						}
																																					}
																																		
																																					// Otherwise
																																					else {
																																					
																																						// Securely clear sum
																																						sum.fill(0);
																																					
																																						// Reject JSON-RPC internal error error response
																																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																					}
																																				
																																				// Catch errors
																																				}).catch(function(error) {
																																				
																																					// Reject JSON-RPC internal error error response
																																					reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																				});
																																			}
																																			
																																			// Otherwise
																																			else {
																																			
																																				// Reject JSON-RPC internal error error response
																																				reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																			}
																																		});
																																	};
																													
																																	// Return getting secret key
																																	return getSecretKey().then(function(secretKey) {
																																	
																																		// Check if cancel didn't occur
																																		if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																		
																																			// Check if creating a secret nonce was successful
																																			var secretNonce = Secp256k1Zkp.createSecretNonce();
																																			
																																			if(secretNonce !== Secp256k1Zkp.OPERATION_FAILED) {
																																		
																																				// Return adding participant to slate
																																				return slate.addParticipant(secretKey, secretNonce, SlateParticipant.NO_MESSAGE, wallet.getNetworkType() === Consensus.MAINNET_NETWORK_TYPE).then(function() {
																																				
																																					// Check if cancel didn't occur
																																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																				
																																						// Securely clear the secret nonce and secret key
																																						secretNonce.fill(0);
																																						secretKey.fill(0);
																																						
																																						// Resolve
																																						resolve();
																																					}
																																			
																																					// Otherwise
																																					else {
																																					
																																						// Securely clear the secret nonce and secret key
																																						secretNonce.fill(0);
																																						secretKey.fill(0);
																																					
																																						// Reject JSON-RPC internal error error response
																																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																					}
																																				
																																				// Catch errors
																																				}).catch(function(error) {
																																				
																																					// Securely clear the secret nonce and secret key
																																					secretNonce.fill(0);
																																					secretKey.fill(0);
																																				
																																					// Reject JSON-RPC internal error error response
																																					reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																				});
																																			}
																																		
																																			// Otherwise
																																			else {
																																			
																																				// Securely clear the secret key
																																				secretKey.fill(0);
																																			
																																				// Reject JSON-RPC internal error error response
																																				reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																			}
																																		}
																																		
																																		// Otherwise
																																		else {
																																		
																																			// Securely clear the secret key
																																			secretKey.fill(0);
																																		
																																			// Reject JSON-RPC internal error error response
																																			reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																		}
																																	
																																	// Catch errors
																																	}).catch(function(error) {
																																	
																																		// Reject JSON-RPC internal error error response
																																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																	});
																																}
																																
																																// Otherwise
																																else {
																																
																																	// Return waiting for wallet's hardware wallet to connect
																																	return self.wallets.waitForHardwareWalletToConnect(wallet.getKeyPath(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Connect the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Connect the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function() {
																																	
																																		// Check if cancel didn't occur
																																		if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																		
																																			// Check if hardware wallet is connected
																																			if(wallet.isHardwareConnected() === true) {
																																
																																				// Return starting transaction for the output amount with the wallet's hardware wallet
																																				return wallet.getHardwareWallet().startTransaction(Wallet.PAYMENT_PROOF_TOR_ADDRESS_KEY_INDEX, output[Wallet.OUTPUT_AMOUNT_INDEX], new BigNumber(0), slate.getFee(), slate.getSenderAddress(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function() {
																																				
																																					// Check if cancel didn't occur
																																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																					
																																						// Check if wallet's hardware wallet is connected
																																						if(wallet.isHardwareConnected() === true) {
																																				
																																							// Return including output in the transaction with the wallet's hardware wallet
																																							return wallet.getHardwareWallet().includeOutputInTransaction(output[Wallet.OUTPUT_AMOUNT_INDEX], output[Wallet.OUTPUT_IDENTIFIER_INDEX], output[Wallet.OUTPUT_SWITCH_TYPE_INDEX], (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function() {
																																							
																																								// Check if cancel didn't occur
																																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																								
																																									// Apply offset
																																									var applyOffset = function() {
																																									
																																										// Return promise
																																										return new Promise(function(resolve, reject) {
																																										
																																											// Check if cancel didn't occur
																																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																												// Check if slate is compact
																																												if(slate.isCompact() === true) {
																																												
																																													// Check if wallet's hardware wallet is connected
																																													if(wallet.isHardwareConnected() === true) {
																																												
																																														// Return applying offset to slate
																																														return slate.applyOffset(wallet.getHardwareWallet(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function() {
																																														
																																															// Check if cancel didn't occur
																																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																														
																																																// Resolve
																																																resolve();
																																															}
																																															
																																															// Otherwise
																																															else {
																																															
																																																// Reject canceled error
																																																reject(Common.CANCELED_ERROR);
																																															}
																																															
																																														// Catch errors
																																														}).catch(function(error) {
																																														
																																															// Check if cancel didn't occur
																																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																														
																																																// Reject error
																																																reject(error);
																																															}
																																											
																																															// Otherwise
																																															else {
																																															
																																																// Reject canceled error
																																																reject(Common.CANCELED_ERROR);
																																															}
																																														});
																																													}
																																									
																																													// Otherwise
																																													else {
																																													
																																														// Reject hardware wallet disconnected error
																																														reject(HardwareWallet.DISCONNECTED_ERROR);
																																													}
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Resolve
																																													resolve();
																																												}
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Reject canceled error
																																												reject(Common.CANCELED_ERROR);
																																											}
																																										});
																																									};
																																									
																																									// Return applying offset
																																									return applyOffset().then(function() {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																								
																																											// Check if wallet's hardware wallet is connected
																																											if(wallet.isHardwareConnected() === true) {
																																											
																																												// Save slate's receiver signature
																																												var oldReceiverSignature = slate.getReceiverSignature();
																																									
																																												// Return adding participant to slate
																																												return slate.addParticipant(wallet.getHardwareWallet(), Slate.NO_ENCRYPTED_SECRET_NONCE, SlateParticipant.NO_MESSAGE, wallet.getNetworkType() === Consensus.MAINNET_NETWORK_TYPE, (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function() {
																																												
																																													// Check if cancel didn't occur
																																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																												
																																														// Check if wallet's hardware wallet is connected
																																														if(wallet.isHardwareConnected() === true) {
																																														
																																															// Return completing transaction with the wallet's hardware wallet
																																															return wallet.getHardwareWallet().completeTransaction().then(function() {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Resolve
																																																	resolve();
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject JSON-RPC internal error error response
																																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																}
																																																
																																															// Catch errors
																																															}).catch(function(error) {
																																															
																																																// Reject JSON-RPC internal error error response
																																																reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																															});
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Remove participant from slate
																																															slate.getParticipants().pop();
																																															
																																															// Restore slate's old receiver signature
																																															slate.setReceiverSignature(oldReceiverSignature);
																																														
																																															// Return adding a slate participant
																																															return addSlateParticipant().then(function() {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Resolve
																																																	resolve();
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject JSON-RPC internal error error response
																																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																}
																																															
																																															// Catch errors
																																															}).catch(function(error) {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Reject error
																																																	reject(error);
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject JSON-RPC internal error error response
																																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																}
																																															});
																																														}
																																													}
																																													
																																													// Otherwise
																																													else {
																																													
																																														// Check if wallet's hardware wallet is connected
																																														if(wallet.isHardwareConnected() === true) {
																																													
																																															// Return canceling transaction with the wallet's hardware wallet and catch errors
																																															return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																															
																																															// Finally
																																															}).finally(function() {
																																														
																																																// Reject JSON-RPC internal error error response
																																																reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																															});
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject JSON-RPC internal error error response
																																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																														}
																																													}
																																												
																																												// Catch errors
																																												}).catch(function(error) {
																																												
																																													// Check if wallet's hardware wallet is connected
																																													if(wallet.isHardwareConnected() === true) {
																																												
																																														// Return canceling transaction with the wallet's hardware wallet and catch errors
																																														return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																														
																																														// Finally
																																														}).finally(function() {
																																														
																																															// Check if cancel didn't occur
																																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																														
																																																// Check if hardware wallet was disconnected
																																																if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																																
																																																	// Check if wallet's hardware wallet is connected
																																																	if(wallet.isHardwareConnected() === true) {
																																																
																																																		// Wallet's hardware wallet disconnect event
																																																		$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																																	
																																																			// Return adding a slate participant
																																																			return addSlateParticipant().then(function() {
																																																			
																																																				// Check if cancel didn't occur
																																																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																			
																																																					// Resolve
																																																					resolve();
																																																				}
																																																				
																																																				// Otherwise
																																																				else {
																																																				
																																																					// Reject JSON-RPC internal error error response
																																																					reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																				}
																																																			
																																																			// Catch errors
																																																			}).catch(function(error) {
																																																			
																																																				// Check if cancel didn't occur
																																																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																			
																																																					// Reject error
																																																					reject(error);
																																																				}
																																																				
																																																				// Otherwise
																																																				else {
																																																				
																																																					// Reject JSON-RPC internal error error response
																																																					reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																				}
																																																			});
																																																		});
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Return adding a slate participant
																																																		return addSlateParticipant().then(function() {
																																																		
																																																			// Check if cancel didn't occur
																																																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																		
																																																				// Resolve
																																																				resolve();
																																																			}
																																																			
																																																			// Otherwise
																																																			else {
																																																			
																																																				// Reject JSON-RPC internal error error response
																																																				reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																			}
																																																		
																																																		// Catch errors
																																																		}).catch(function(error) {
																																																		
																																																			// Check if cancel didn't occur
																																																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																		
																																																				// Reject error
																																																				reject(error);
																																																			}
																																																			
																																																			// Otherwise
																																																			else {
																																																			
																																																				// Reject JSON-RPC internal error error response
																																																				reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																			}
																																																		});
																																																	}
																																																}
																																																
																																																// Otherwise
																																																else {
																																															
																																																	// Reject JSON-RPC internal error error response
																																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																}
																																															}
																																															
																																															// Otherwise
																																															else {
																																															
																																																// Reject JSON-RPC internal error error response
																																																reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																															}
																																														});
																																													}
																																													
																																													// Otherwise
																																													else {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Check if hardware wallet was disconnected
																																															if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																																
																																																// Return adding a slate participant
																																																return addSlateParticipant().then(function() {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																
																																																		// Resolve
																																																		resolve();
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject JSON-RPC internal error error response
																																																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																	}
																																																
																																																// Catch errors
																																																}).catch(function(error) {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																
																																																		// Reject error
																																																		reject(error);
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject JSON-RPC internal error error response
																																																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																	}
																																																});
																																															}
																																															
																																															// Otherwise
																																															else {
																																														
																																																// Reject JSON-RPC internal error error response
																																																reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																															}
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject JSON-RPC internal error error response
																																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																														}
																																													}
																																												});
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Return adding a slate participant
																																												return addSlateParticipant().then(function() {
																																												
																																													// Check if cancel didn't occur
																																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																												
																																														// Resolve
																																														resolve();
																																													}
																																													
																																													// Otherwise
																																													else {
																																													
																																														// Reject JSON-RPC internal error error response
																																														reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																													}
																																												
																																												// Catch errors
																																												}).catch(function(error) {
																																												
																																													// Check if cancel didn't occur
																																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																												
																																														// Reject error
																																														reject(error);
																																													}
																																													
																																													// Otherwise
																																													else {
																																													
																																														// Reject JSON-RPC internal error error response
																																														reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																													}
																																												});
																																											}
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Check if wallet's hardware wallet is connected
																																											if(wallet.isHardwareConnected() === true) {
																																										
																																												// Return canceling transaction with the wallet's hardware wallet and catch errors
																																												return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																												
																																												// Finally
																																												}).finally(function() {
																																											
																																													// Reject JSON-RPC internal error error response
																																													reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																												});
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Reject JSON-RPC internal error error response
																																												reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																											}
																																										}
																																									
																																									// Catch errors
																																									}).catch(function(error) {
																																									
																																										// Check if wallet's hardware wallet is connected
																																										if(wallet.isHardwareConnected() === true) {
																																									
																																											// Return canceling transaction with the wallet's hardware wallet and catch errors
																																											return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																											
																																											// Finally
																																											}).finally(function() {
																																											
																																												// Check if cancel didn't occur
																																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																													// Check if hardware wallet was disconnected
																																													if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																													
																																														// Check if wallet's hardware wallet is connected
																																														if(wallet.isHardwareConnected() === true) {
																																													
																																															// Wallet's hardware wallet disconnect event
																																															$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																														
																																																// Return adding a slate participant
																																																return addSlateParticipant().then(function() {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																
																																																		// Resolve
																																																		resolve();
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject JSON-RPC internal error error response
																																																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																	}
																																																
																																																// Catch errors
																																																}).catch(function(error) {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																
																																																		// Reject error
																																																		reject(error);
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject JSON-RPC internal error error response
																																																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																	}
																																																});
																																															});
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Return adding a slate participant
																																															return addSlateParticipant().then(function() {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Resolve
																																																	resolve();
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject JSON-RPC internal error error response
																																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																}
																																															
																																															// Catch errors
																																															}).catch(function(error) {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Reject error
																																																	reject(error);
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject JSON-RPC internal error error response
																																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																}
																																															});
																																														}
																																													}
																																													
																																													// Otherwise
																																													else {
																																												
																																														// Reject JSON-RPC internal error error response
																																														reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																													}
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Reject JSON-RPC internal error error response
																																													reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																												}
																																											});
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Check if cancel didn't occur
																																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																										
																																												// Check if hardware wallet was disconnected
																																												if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																													
																																													// Return adding a slate participant
																																													return addSlateParticipant().then(function() {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Resolve
																																															resolve();
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject JSON-RPC internal error error response
																																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																														}
																																													
																																													// Catch errors
																																													}).catch(function(error) {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Reject error
																																															reject(error);
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject JSON-RPC internal error error response
																																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																														}
																																													});
																																												}
																																												
																																												// Otherwise
																																												else {
																																											
																																													// Reject JSON-RPC internal error error response
																																													reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																												}
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Reject JSON-RPC internal error error response
																																												reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																											}
																																										}
																																									});
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Check if wallet's hardware wallet is connected
																																									if(wallet.isHardwareConnected() === true) {
																																								
																																										// Return canceling transaction with the wallet's hardware wallet and catch errors
																																										return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																										
																																										// Finally
																																										}).finally(function() {
																																									
																																											// Reject JSON-RPC internal error error response
																																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																										});
																																									}
																																									
																																									// Otherwise
																																									else {
																																									
																																										// Reject JSON-RPC internal error error response
																																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																									}
																																								}
																																								
																																							// Catch errors
																																							}).catch(function(error) {
																																							
																																								// Check if wallet's hardware wallet is connected
																																								if(wallet.isHardwareConnected() === true) {
																																							
																																									// Return canceling transaction with the wallet's hardware wallet and catch errors
																																									return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																									
																																									// Finally
																																									}).finally(function() {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Check if hardware wallet was disconnected
																																											if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																											
																																												// Check if wallet's hardware wallet is connected
																																												if(wallet.isHardwareConnected() === true) {
																																											
																																													// Wallet's hardware wallet disconnect event
																																													$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																												
																																														// Return adding a slate participant
																																														return addSlateParticipant().then(function() {
																																														
																																															// Check if cancel didn't occur
																																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																														
																																																// Resolve
																																																resolve();
																																															}
																																															
																																															// Otherwise
																																															else {
																																															
																																																// Reject JSON-RPC internal error error response
																																																reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																															}
																																														
																																														// Catch errors
																																														}).catch(function(error) {
																																														
																																															// Check if cancel didn't occur
																																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																														
																																																// Reject error
																																																reject(error);
																																															}
																																															
																																															// Otherwise
																																															else {
																																															
																																																// Reject JSON-RPC internal error error response
																																																reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																															}
																																														});
																																													});
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Return adding a slate participant
																																													return addSlateParticipant().then(function() {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Resolve
																																															resolve();
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject JSON-RPC internal error error response
																																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																														}
																																													
																																													// Catch errors
																																													}).catch(function(error) {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Reject error
																																															reject(error);
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject JSON-RPC internal error error response
																																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																														}
																																													});
																																												}
																																											}
																																											
																																											// Otherwise
																																											else {
																																										
																																												// Reject JSON-RPC internal error error response
																																												reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																											}
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject JSON-RPC internal error error response
																																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																										}
																																									});
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Check if cancel didn't occur
																																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																								
																																										// Check if hardware wallet was disconnected
																																										if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																											
																																											// Return adding a slate participant
																																											return addSlateParticipant().then(function() {
																																											
																																												// Check if cancel didn't occur
																																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																													// Resolve
																																													resolve();
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Reject JSON-RPC internal error error response
																																													reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																												}
																																											
																																											// Catch errors
																																											}).catch(function(error) {
																																											
																																												// Check if cancel didn't occur
																																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																													// Reject error
																																													reject(error);
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Reject JSON-RPC internal error error response
																																													reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																												}
																																											});
																																										}
																																										
																																										// Otherwise
																																										else {
																																									
																																											// Reject JSON-RPC internal error error response
																																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																										}
																																									}
																																									
																																									// Otherwise
																																									else {
																																									
																																										// Reject JSON-RPC internal error error response
																																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																									}
																																								}
																																							});
																																						}
																																						
																																						// Otherwise
																																						else {
																																						
																																							// Return adding a slate participant
																																							return addSlateParticipant().then(function() {
																																							
																																								// Check if cancel didn't occur
																																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																							
																																									// Resolve
																																									resolve();
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Reject JSON-RPC internal error error response
																																									reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																								}
																																							
																																							// Catch errors
																																							}).catch(function(error) {
																																							
																																								// Check if cancel didn't occur
																																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																							
																																									// Reject error
																																									reject(error);
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Reject JSON-RPC internal error error response
																																									reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																								}
																																							});
																																						}
																																					}
																																					
																																					// Otherwise
																																					else {
																																					
																																						// Check if wallet's hardware wallet is connected
																																						if(wallet.isHardwareConnected() === true) {
																																					
																																							// Return canceling transaction with the wallet's hardware wallet and catch errors
																																							return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																							
																																							// Finally
																																							}).finally(function() {
																																						
																																								// Reject JSON-RPC internal error error response
																																								reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																							});
																																						}
																																						
																																						// Otherwise
																																						else {
																																						
																																							// Reject JSON-RPC internal error error response
																																							reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																						}
																																					}
																																					
																																				// Catch errors
																																				}).catch(function(error) {
																																				
																																					// Check if cancel didn't occur
																																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																				
																																						// Check if hardware wallet was disconnected
																																						if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																						
																																							// Check if wallet's hardware wallet is connected
																																							if(wallet.isHardwareConnected() === true) {
																																						
																																								// Wallet's hardware wallet disconnect event
																																								$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																							
																																									// Return adding a slate participant
																																									return addSlateParticipant().then(function() {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Resolve
																																											resolve();
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject JSON-RPC internal error error response
																																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																										}
																																									
																																									// Catch errors
																																									}).catch(function(error) {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Reject error
																																											reject(error);
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject JSON-RPC internal error error response
																																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																										}
																																									});
																																								});
																																							}
																																							
																																							// Otherwise
																																							else {
																																							
																																								// Return adding a slate participant
																																								return addSlateParticipant().then(function() {
																																								
																																									// Check if cancel didn't occur
																																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																								
																																										// Resolve
																																										resolve();
																																									}
																																									
																																									// Otherwise
																																									else {
																																									
																																										// Reject JSON-RPC internal error error response
																																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																									}
																																								
																																								// Catch errors
																																								}).catch(function(error) {
																																								
																																									// Check if cancel didn't occur
																																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																								
																																										// Reject error
																																										reject(error);
																																									}
																																									
																																									// Otherwise
																																									else {
																																									
																																										// Reject JSON-RPC internal error error response
																																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																									}
																																								});
																																							}
																																						}
																																						
																																						// Otherwise
																																						else {
																																					
																																							// Reject JSON-RPC internal error error response
																																							reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																						}
																																					}
																																					
																																					// Otherwise
																																					else {
																																					
																																						// Reject JSON-RPC internal error error response
																																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																					}
																																				});
																																			}
																																			
																																			// Otherwise
																																			else {
																																			
																																				// Return adding a slate participant
																																				return addSlateParticipant().then(function() {
																																				
																																					// Check if cancel didn't occur
																																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																				
																																						// Resolve
																																						resolve();
																																					}
																																					
																																					// Otherwise
																																					else {
																																					
																																						// Reject JSON-RPC internal error error response
																																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																					}
																																				
																																				// Catch errors
																																				}).catch(function(error) {
																																				
																																					// Check if cancel didn't occur
																																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																				
																																						// Reject error
																																						reject(error);
																																					}
																																					
																																					// Otherwise
																																					else {
																																					
																																						// Reject JSON-RPC internal error error response
																																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																					}
																																				});
																																			}
																																		}
																																		
																																		// Otherwise
																																		else {
																																		
																																			// Reject JSON-RPC internal error error response
																																			reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																		}
																																	
																																	// Catch errors
																																	}).catch(function(error) {
																																	
																																		// Reject JSON-RPC internal error error response
																																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																	});
																																}
																															}
																															
																															// Otherwise
																															else {
																															
																																// Reject JSON-RPC internal error error response
																																reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																															}	
																														});
																													};
																													
																													// Return adding a slate participant
																													return addSlateParticipant().then(function() {
																													
																														// Check if cancel didn't occur
																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																														
																															// Encode slate
																															var encodeSlate = function(serializedSlate) {
																															
																																// Return promise
																																return new Promise(function(resolve, reject) {
																																
																																	// Check if cancel didn't occur
																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																	
																																		// Check if serialized slate is compact
																																		if(serializedSlate instanceof Uint8Array === true) {
																																		
																																			// Check if a Slatepack is provided and it's encrypted
																																			if(typeof data["params"][Api.RECEIVE_TRANSACTION_SLATE_PARAMETER_INDEX] === "string" && Slatepack.isEncryptedSlatepack(data["params"][Api.RECEIVE_TRANSACTION_SLATE_PARAMETER_INDEX]) === true) {
																																		
																																				// Check if wallet isn't a hardware wallet
																																				if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																																			
																																					// Return getting wallet's Tor secret key
																																					return wallet.getAddressKey(Wallet.PAYMENT_PROOF_TOR_ADDRESS_KEY_INDEX).then(function(secretKey) {
																																					
																																						// Check if cancel didn't occur
																																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																						
																																							// Return encoding the serialized slate
																																							return Slatepack.encodeSlatepack(serializedSlate, secretKey, Slatepack.getSlatepackSenderPublicKey(data["params"][Api.RECEIVE_TRANSACTION_SLATE_PARAMETER_INDEX])).then(function(slatepack) {
																																							
																																								// Securely clear secret key
																																								secretKey.fill(0);
																																								
																																								// Check if cancel didn't occur
																																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																								
																																									// Resolve the Slatepack
																																									resolve(slatepack);
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Reject JSON-RPC internal error error response
																																									reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																								}
																																							
																																							// Catch errors
																																							}).catch(function(error) {
																																							
																																								// Securely clear secret key
																																								secretKey.fill(0);
																																								
																																								// Reject JSON-RPC internal error error response
																																								reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																							});
																																						}
																																						
																																						// Otherwise
																																						else {
																																						
																																							// Securely clear secret key
																																							secretKey.fill(0);
																																						
																																							// Reject JSON-RPC internal error error response
																																							reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																						}
																																					
																																					// Catch errors
																																					}).catch(function(error) {
																																					
																																						// Reject JSON-RPC internal error error response
																																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																					});
																																				}
																																				
																																				// Otherwise
																																				else {
																																				
																																					// Return waiting for wallet's hardware wallet to connect
																																					return self.wallets.waitForHardwareWalletToConnect(wallet.getKeyPath(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Connect the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Connect the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function() {
																																					
																																						// Check if cancel didn't occur
																																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																				
																																							// Check if hardware wallet is connected
																																							if(wallet.isHardwareConnected() === true) {
																																							
																																								// Return encoding the serialized slate
																																								return Slatepack.encodeSlatepack(serializedSlate, wallet.getHardwareWallet(), Slatepack.getSlatepackSenderPublicKey(data["params"][Api.RECEIVE_TRANSACTION_SLATE_PARAMETER_INDEX]), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function(slatepack) {
																																								
																																									// Check if cancel didn't occur
																																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																								
																																										// Resolve the Slatepack
																																										resolve(slatepack);
																																									}
																																									
																																									// Otherwise
																																									else {
																																									
																																										// Reject JSON-RPC internal error error response
																																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																									}
																																									
																																								// Catch errors
																																								}).catch(function(error) {
																																								
																																									// Check if cancel didn't occur
																																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																								
																																										// Check if hardware wallet was disconnected
																																										if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																										
																																											// Check if wallet's hardware wallet is connected
																																											if(wallet.isHardwareConnected() === true) {
																																										
																																												// Wallet's hardware wallet disconnect event
																																												$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																											
																																													// Return encoding the serialized slate
																																													return encodeSlate(serializedSlate).then(function(slatepack) {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Resolve the Slatepack
																																															resolve(slatepack);
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject JSON-RPC internal error error response
																																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																														}
																																													
																																													// Catch errors
																																													}).catch(function(error) {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Reject error
																																															reject(error);
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject JSON-RPC internal error error response
																																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																														}
																																													});
																																												});
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Return encoding the serialized slate
																																												return encodeSlate(serializedSlate).then(function(slatepack) {
																																												
																																													// Check if cancel didn't occur
																																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																												
																																														// Resolve the Slatepack
																																														resolve(slatepack);
																																													}
																																													
																																													// Otherwise
																																													else {
																																													
																																														// Reject JSON-RPC internal error error response
																																														reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																													}
																																												
																																												// Catch errors
																																												}).catch(function(error) {
																																												
																																													// Check if cancel didn't occur
																																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																												
																																														// Reject error
																																														reject(error);
																																													}
																																													
																																													// Otherwise
																																													else {
																																													
																																														// Reject JSON-RPC internal error error response
																																														reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																													}
																																												});
																																											}
																																										}
																																										
																																										// Otherwise
																																										else {
																																									
																																											// Reject JSON-RPC internal error error response
																																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																										}
																																									}
																																									
																																									// Otherwise
																																									else {
																																									
																																										// Reject JSON-RPC internal error error response
																																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																									}
																																								});
																																							}
																																							
																																							// Otherwise
																																							else {
																																							
																																								// Return encoding the serialized slate
																																								return encodeSlate(serializedSlate).then(function(slatepack) {
																																								
																																									// Check if cancel didn't occur
																																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																								
																																										// Resolve the Slatepack
																																										resolve(slatepack);
																																									}
																																									
																																									// Otherwise
																																									else {
																																									
																																										// Reject JSON-RPC internal error error response
																																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																									}
																																								
																																								// Catch errors
																																								}).catch(function(error) {
																																								
																																									// Check if cancel didn't occur
																																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																								
																																										// Reject error
																																										reject(error);
																																									}
																																									
																																									// Otherwise
																																									else {
																																									
																																										// Reject JSON-RPC internal error error response
																																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																									}
																																								});
																																							}
																																						}
																																													
																																						// Otherwise
																																						else {
																																						
																																							// Reject JSON-RPC internal error error response
																																							reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																						}
																																						
																																					// Catch errors
																																					}).catch(function(error) {
																																					
																																						// Reject JSON-RPC internal error error response
																																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																					});
																																				}
																																			}
																																			
																																			// Otherwise
																																			else {
																																			
																																				// Return encoding the serialized slate
																																				return Slatepack.encodeSlatepack(serializedSlate).then(function(slatepack) {
																																				
																																					// Check if cancel didn't occur
																																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																					
																																						// Resolve the Slatepack
																																						resolve(slatepack);
																																					}
																																					
																																					// Otherwise
																																					else {
																																					
																																						// Reject JSON-RPC internal error error response
																																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																					}
																																				
																																				// Catch errors
																																				}).catch(function(error) {
																																				
																																					// Reject JSON-RPC internal error error response
																																					reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																				});
																																			}
																																		}
																																		
																																		// Otherwise
																																		else {
																																		
																																			// Resolve the serialized slate
																																			resolve(serializedSlate);
																																		}
																																	}
																																	
																																	// Otherwise
																																	else {
																																	
																																		// Reject JSON-RPC internal error error response
																																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																	}
																																});
																															};
																															
																															// Check if slate has payment proof
																															if(slate.hasPaymentProof() === true) {
																															
																																// Get proof address
																																var getProofAddress = function() {
																																
																																	// Return promise
																																	return new Promise(function(resolve, reject) {
																																	
																																		// Check if cancel didn't occur
																																		if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																		
																																			// Check if wallet isn't a hardware wallet
																																			if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																																	
																																				// Check if the slate's sender and receiver address are the same
																																				if(slate.getReceiverAddress() === slate.getSenderAddress()) {
																																				
																																					// Check wallet type
																																					switch(Consensus.getWalletType()) {
																																					
																																						// MWC wallet
																																						case Consensus.MWC_WALLET_TYPE:
																																				
																																							// Return getting Tor proof address
																																							return wallet.getTorProofAddress().then(function(proofAddress) {
																																							
																																								// Check if cancel didn't occur
																																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																							
																																									// Set slate's receiver address to the proof address
																																									slate.setReceiverAddress(proofAddress);
																																								
																																									// Resolve proof address
																																									resolve(proofAddress);
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Reject JSON-RPC internal error error response
																																									reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																								}
																																							
																																							// Catch errors
																																							}).catch(function(error) {
																																							
																																								// Reject JSON-RPC internal error error response
																																								reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																							});
																																						
																																						// GRIN wallet
																																						case Consensus.GRIN_WALLET_TYPE:
																																						
																																							// Return getting Slatepack proof address
																																							return wallet.getSlatepackProofAddress().then(function(proofAddress) {
																																							
																																								// Check if cancel didn't occur
																																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																							
																																									// Set slate's receiver address to the proof address
																																									slate.setReceiverAddress(proofAddress);
																																								
																																									// Resolve proof address
																																									resolve(proofAddress);
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Reject JSON-RPC internal error error response
																																									reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																								}
																																							
																																							// Catch errors
																																							}).catch(function(error) {
																																							
																																								// Reject JSON-RPC internal error error response
																																								reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																							});
																																					}
																																				}
																																				
																																				// Otherwise
																																				else {
																																				
																																					// Check wallet type
																																					switch(Consensus.getWalletType()) {
																																					
																																						// MWC wallet
																																						case Consensus.MWC_WALLET_TYPE:
																																		
																																							// Check receiver address length
																																							switch(slate.getReceiverAddress()["length"]) {
																																							
																																								// Tor address length
																																								case Tor.ADDRESS_LENGTH:
																																								
																																									// Return getting Tor proof address
																																									return wallet.getTorProofAddress().then(function(proofAddress) {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Resolve proof address
																																											resolve(proofAddress);
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject JSON-RPC internal error error response
																																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																										}
																																									
																																									// Catch errors
																																									}).catch(function(error) {
																																									
																																										// Reject JSON-RPC internal error error response
																																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																									});
																																								
																																								// MQS address length
																																								case Mqs.ADDRESS_LENGTH:
																																								
																																									// Return getting MQS proof address
																																									return wallet.getMqsProofAddress().then(function(proofAddress) {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Resolve proof address
																																											resolve(proofAddress);
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject JSON-RPC internal error error response
																																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																										}
																																									
																																									// Catch errors
																																									}).catch(function(error) {
																																									
																																										// Reject JSON-RPC internal error error response
																																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																									});
																																								
																																								// Default
																																								default:
																																								
																																									// Reject JSON-RPC invalid parameters error response
																																									reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																																									
																																									// Break
																																									break;
																																							}
																																							
																																							// Break
																																							break;
																																						
																																						// GRIN wallet
																																						case Consensus.GRIN_WALLET_TYPE:
																																						
																																							// Check receiver address length
																																							switch(slate.getReceiverAddress()["length"]) {
																																							
																																								// Slatepack address length
																																								case Slatepack.ADDRESS_LENGTH:
																																								
																																									// Return getting Slatepack proof address
																																									return wallet.getSlatepackProofAddress().then(function(proofAddress) {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Resolve proof address
																																											resolve(proofAddress);
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject JSON-RPC internal error error response
																																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																										}
																																									
																																									// Catch errors
																																									}).catch(function(error) {
																																									
																																										// Reject JSON-RPC internal error error response
																																										reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																									});
																																								
																																								// Default
																																								default:
																																								
																																									// Reject JSON-RPC invalid parameters error response
																																									reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																																									
																																									// Break
																																									break;
																																							}
																																							
																																							// Break
																																							break;
																																					}
																																				}
																																			}
																																			
																																			// Otherwise
																																			else {
																																			
																																				// Return waiting for wallet's hardware wallet to connect
																																				return self.wallets.waitForHardwareWalletToConnect(wallet.getKeyPath(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Connect the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Connect the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function() {
																																				
																																					// Check if cancel didn't occur
																																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																			
																																						// Check if the slate's sender and receiver address are the same
																																						if(slate.getReceiverAddress() === slate.getSenderAddress()) {
																																						
																																							// Check wallet type
																																							switch(Consensus.getWalletType()) {
																																							
																																								// MWC wallet
																																								case Consensus.MWC_WALLET_TYPE:
																																						
																																									// Return getting Tor proof address
																																									return wallet.getTorProofAddress((wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function(proofAddress) {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Set slate's receiver address to the proof address
																																											slate.setReceiverAddress(proofAddress);
																																										
																																											// Resolve proof address
																																											resolve(proofAddress);
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject JSON-RPC internal error error response
																																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																										}
																																									
																																									// Catch errors
																																									}).catch(function(error) {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Check if hardware wallet was disconnected
																																											if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																											
																																												// Check if wallet's hardware wallet is connected
																																												if(wallet.isHardwareConnected() === true) {
																																											
																																													// Wallet's hardware wallet disconnect event
																																													$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																												
																																														// Return getting proof address
																																														return getProofAddress().then(function(proofAddress) {
																																														
																																															// Check if cancel didn't occur
																																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																														
																																																// Resolve proof address
																																																resolve(proofAddress);
																																															}
																																															
																																															// Otherwise
																																															else {
																																															
																																																// Reject JSON-RPC internal error error response
																																																reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																															}
																																														
																																														// Catch errors
																																														}).catch(function(error) {
																																														
																																															// Check if cancel didn't occur
																																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																														
																																																// Reject error
																																																reject(error);
																																															}
																																															
																																															// Otherwise
																																															else {
																																															
																																																// Reject JSON-RPC internal error error response
																																																reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																															}
																																														});
																																													});
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Return getting proof address
																																													return getProofAddress().then(function(proofAddress) {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Resolve proof address
																																															resolve(proofAddress);
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject JSON-RPC internal error error response
																																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																														}
																																													
																																													// Catch errors
																																													}).catch(function(error) {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Reject error
																																															reject(error);
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject JSON-RPC internal error error response
																																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																														}
																																													});
																																												}
																																											}
																																											
																																											// Otherwise
																																											else {
																																										
																																												// Reject JSON-RPC internal error error response
																																												reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																											}
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject JSON-RPC internal error error response
																																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																										}
																																									});
																																								
																																								// GRIN wallet
																																								case Consensus.GRIN_WALLET_TYPE:
																																								
																																									// Return getting Slatepack proof address
																																									return wallet.getSlatepackProofAddress((wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function(proofAddress) {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Set slate's receiver address to the proof address
																																											slate.setReceiverAddress(proofAddress);
																																										
																																											// Resolve proof address
																																											resolve(proofAddress);
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject JSON-RPC internal error error response
																																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																										}
																																									
																																									// Catch errors
																																									}).catch(function(error) {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Check if hardware wallet was disconnected
																																											if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																											
																																												// Check if wallet's hardware wallet is connected
																																												if(wallet.isHardwareConnected() === true) {
																																											
																																													// Wallet's hardware wallet disconnect event
																																													$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																												
																																														// Return getting proof address
																																														return getProofAddress().then(function(proofAddress) {
																																														
																																															// Check if cancel didn't occur
																																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																														
																																																// Resolve proof address
																																																resolve(proofAddress);
																																															}
																																															
																																															// Otherwise
																																															else {
																																															
																																																// Reject JSON-RPC internal error error response
																																																reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																															}
																																														
																																														// Catch errors
																																														}).catch(function(error) {
																																														
																																															// Check if cancel didn't occur
																																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																														
																																																// Reject error
																																																reject(error);
																																															}
																																															
																																															// Otherwise
																																															else {
																																															
																																																// Reject JSON-RPC internal error error response
																																																reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																															}
																																														});
																																													});
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Return getting proof address
																																													return getProofAddress().then(function(proofAddress) {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Resolve proof address
																																															resolve(proofAddress);
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject JSON-RPC internal error error response
																																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																														}
																																													
																																													// Catch errors
																																													}).catch(function(error) {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Reject error
																																															reject(error);
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject JSON-RPC internal error error response
																																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																														}
																																													});
																																												}
																																											}
																																											
																																											// Otherwise
																																											else {
																																										
																																												// Reject JSON-RPC internal error error response
																																												reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																											}
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject JSON-RPC internal error error response
																																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																										}
																																									});
																																							}
																																						}
																																						
																																						// Otherwise
																																						else {
																																						
																																							// Check wallet type
																																							switch(Consensus.getWalletType()) {
																																							
																																								// MWC wallet
																																								case Consensus.MWC_WALLET_TYPE:
																																				
																																									// Check receiver address length
																																									switch(slate.getReceiverAddress()["length"]) {
																																									
																																										// Tor address length
																																										case Tor.ADDRESS_LENGTH:
																																										
																																											// Return getting Tor proof address
																																											return wallet.getTorProofAddress((wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function(proofAddress) {
																																											
																																												// Check if cancel didn't occur
																																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																													// Resolve proof address
																																													resolve(proofAddress);
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Reject JSON-RPC internal error error response
																																													reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																												}
																																											
																																											// Catch errors
																																											}).catch(function(error) {
																																											
																																												// Check if cancel didn't occur
																																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																													// Check if hardware wallet was disconnected
																																													if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																													
																																														// Check if wallet's hardware wallet is connected
																																														if(wallet.isHardwareConnected() === true) {
																																													
																																															// Wallet's hardware wallet disconnect event
																																															$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																														
																																																// Return getting proof address
																																																return getProofAddress().then(function(proofAddress) {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																
																																																		// Resolve proof address
																																																		resolve(proofAddress);
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject JSON-RPC internal error error response
																																																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																	}
																																																
																																																// Catch errors
																																																}).catch(function(error) {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																
																																																		// Reject error
																																																		reject(error);
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject JSON-RPC internal error error response
																																																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																	}
																																																});
																																															});
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Return getting proof address
																																															return getProofAddress().then(function(proofAddress) {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Resolve proof address
																																																	resolve(proofAddress);
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject JSON-RPC internal error error response
																																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																}
																																															
																																															// Catch errors
																																															}).catch(function(error) {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Reject error
																																																	reject(error);
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject JSON-RPC internal error error response
																																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																}
																																															});
																																														}
																																													}
																																													
																																													// Otherwise
																																													else {
																																												
																																														// Reject JSON-RPC internal error error response
																																														reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																													}
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Reject JSON-RPC internal error error response
																																													reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																												}
																																											});
																																										
																																										// MQS address length
																																										case Mqs.ADDRESS_LENGTH:
																																										
																																											// Return getting MQS proof address
																																											return wallet.getMqsProofAddress((wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function(proofAddress) {
																																											
																																												// Check if cancel didn't occur
																																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																													// Resolve proof address
																																													resolve(proofAddress);
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Reject JSON-RPC internal error error response
																																													reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																												}
																																											
																																											// Catch errors
																																											}).catch(function(error) {
																																											
																																												// Check if cancel didn't occur
																																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																													// Check if hardware wallet was disconnected
																																													if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																													
																																														// Check if wallet's hardware wallet is connected
																																														if(wallet.isHardwareConnected() === true) {
																																													
																																															// Wallet's hardware wallet disconnect event
																																															$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																														
																																																// Return getting proof address
																																																return getProofAddress().then(function(proofAddress) {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																
																																																		// Resolve proof address
																																																		resolve(proofAddress);
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject JSON-RPC internal error error response
																																																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																	}
																																																
																																																// Catch errors
																																																}).catch(function(error) {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																
																																																		// Reject error
																																																		reject(error);
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject JSON-RPC internal error error response
																																																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																	}
																																																});
																																															});
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Return getting proof address
																																															return getProofAddress().then(function(proofAddress) {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Resolve proof address
																																																	resolve(proofAddress);
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject JSON-RPC internal error error response
																																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																}
																																															
																																															// Catch errors
																																															}).catch(function(error) {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Reject error
																																																	reject(error);
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject JSON-RPC internal error error response
																																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																}
																																															});
																																														}
																																													}
																																													
																																													// Otherwise
																																													else {
																																												
																																														// Reject JSON-RPC internal error error response
																																														reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																													}
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Reject JSON-RPC internal error error response
																																													reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																												}
																																											});
																																										
																																										// Default
																																										default:
																																										
																																											// Reject JSON-RPC invalid parameters error response
																																											reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																																											
																																											// Break
																																											break;
																																									}
																																									
																																									// Break
																																									break;
																																								
																																								// GRIN wallet
																																								case Consensus.GRIN_WALLET_TYPE:
																																								
																																									// Check receiver address length
																																									switch(slate.getReceiverAddress()["length"]) {
																																									
																																										// Slatepack address length
																																										case Slatepack.ADDRESS_LENGTH:
																																										
																																											// Return getting Slatepack proof address
																																											return wallet.getSlatepackProofAddress((wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function(proofAddress) {
																																											
																																												// Check if cancel didn't occur
																																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																													// Resolve proof address
																																													resolve(proofAddress);
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Reject JSON-RPC internal error error response
																																													reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																												}
																																											
																																											// Catch errors
																																											}).catch(function(error) {
																																											
																																												// Check if cancel didn't occur
																																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																													// Check if hardware wallet was disconnected
																																													if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																													
																																														// Check if wallet's hardware wallet is connected
																																														if(wallet.isHardwareConnected() === true) {
																																													
																																															// Wallet's hardware wallet disconnect event
																																															$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																														
																																																// Return getting proof address
																																																return getProofAddress().then(function(proofAddress) {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																
																																																		// Resolve proof address
																																																		resolve(proofAddress);
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject JSON-RPC internal error error response
																																																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																	}
																																																
																																																// Catch errors
																																																}).catch(function(error) {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																
																																																		// Reject error
																																																		reject(error);
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject JSON-RPC internal error error response
																																																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																	}
																																																});
																																															});
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Return getting proof address
																																															return getProofAddress().then(function(proofAddress) {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Resolve proof address
																																																	resolve(proofAddress);
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject JSON-RPC internal error error response
																																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																}
																																															
																																															// Catch errors
																																															}).catch(function(error) {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Reject error
																																																	reject(error);
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject JSON-RPC internal error error response
																																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																																}
																																															});
																																														}
																																													}
																																													
																																													// Otherwise
																																													else {
																																												
																																														// Reject JSON-RPC internal error error response
																																														reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																													}
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Reject JSON-RPC internal error error response
																																													reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																												}
																																											});
																																										
																																										// Default
																																										default:
																																										
																																											// Reject JSON-RPC invalid parameters error response
																																											reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																																											
																																											// Break
																																											break;
																																									}
																																								
																																									// Break
																																									break;
																																							}
																																						}
																																					}
																																					
																																					// Otherwise
																																					else {
																																					
																																						// Reject JSON-RPC internal error error response
																																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																					}
																																				
																																				// Catch errors
																																				}).catch(function(error) {
																																				
																																					// Reject JSON-RPC internal error error response
																																					reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																				});
																																			}
																																		}
																																		
																																		// Otherwise
																																		else {
																																		
																																			// Reject JSON-RPC internal error error response
																																			reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																		}
																																	});
																																};
																															
																																// Return getting proof address
																																return getProofAddress().then(function(proofAddress) {
																																
																																	// Check if cancel didn't occur
																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																
																																		// Check if slate's receiver address is the same as the proof address
																																		if(proofAddress === slate.getReceiverAddress()) {
																																		
																																			// Try
																																			try {
																																			
																																				// Get excess from slate
																																				var excess = slate.getExcess();
																																			}
																																			
																																			// Catch errors
																																			catch(error) {
																																			
																																				// Reject JSON-RPC internal error error response
																																				reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																				
																																				// Return
																																				return;
																																			}
																																			
																																			// Get payment proof
																																			var getPaymentProof = function() {
																																			
																																				// Return promise
																																				return new Promise(function(resolve, reject) {
																																				
																																					// Check if cancel didn't occur
																																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																				
																																						// Check if wallet isn't a hardware wallet
																																						if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																																						
																																							// Check wallet type
																																							switch(Consensus.getWalletType()) {
																																							
																																								// MWC wallet
																																								case Consensus.MWC_WALLET_TYPE:
																																				
																																									// Check receiver address length
																																									switch(slate.getReceiverAddress()["length"]) {
																																									
																																										// Tor address length
																																										case Tor.ADDRESS_LENGTH:
																																										
																																											// Return wallet building Tor payment proof
																																											return wallet.buildTorPaymentProof(slate.getAmount(), excess, slate.getSenderAddress()).then(function(paymentProof) {
																																											
																																												// Check if cancel didn't occur
																																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																													// Resolve payment proof
																																													resolve(paymentProof);
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Reject JSON-RPC internal error error response
																																													reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																												}
																																											
																																											// Catch errors
																																											}).catch(function(error) {
																																											
																																												// Reject JSON-RPC internal error error response
																																												reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																											});
																																										
																																										// MQS address length
																																										case Mqs.ADDRESS_LENGTH:
																																										
																																											// Return wallet building MQS payment proof
																																											return wallet.buildMqsPaymentProof(slate.getAmount(), excess, slate.getSenderAddress()).then(function(paymentProof) {
																																											
																																												// Check if cancel didn't occur
																																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																													// Resolve payment proof
																																													resolve(paymentProof);
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Reject JSON-RPC internal error error response
																																													reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																												}
																																											
																																											// Catch errors
																																											}).catch(function(error) {
																																											
																																												// Reject JSON-RPC internal error error response
																																												reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																											});
																																										
																																										// Default
																																										default:
																																										
																																											// Reject JSON-RPC invalid parameters error response
																																											reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																																											
																																											// Break
																																											break;
																																									}
																																									
																																									// Break
																																									break;
																																								
																																								// GRIN wallet
																																								case Consensus.GRIN_WALLET_TYPE:
																																								
																																									// Check receiver address length
																																									switch(slate.getReceiverAddress()["length"]) {
																																									
																																										// Slatepack address length
																																										case Slatepack.ADDRESS_LENGTH:
																																										
																																											// Return wallet building Slatepack payment proof
																																											return wallet.buildSlatepackPaymentProof(slate.getAmount(), excess, slate.getSenderAddress()).then(function(paymentProof) {
																																											
																																												// Check if cancel didn't occur
																																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																													// Resolve payment proof
																																													resolve(paymentProof);
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Reject JSON-RPC internal error error response
																																													reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																												}
																																											
																																											// Catch errors
																																											}).catch(function(error) {
																																											
																																												// Reject JSON-RPC internal error error response
																																												reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																											});
																																										
																																										// Default
																																										default:
																																										
																																											// Reject JSON-RPC invalid parameters error response
																																											reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																																											
																																											// Break
																																											break;
																																									}
																																								
																																									// Break
																																									break;
																																							}
																																						}
																																						
																																						// Otherwise
																																						else {
																																						
																																							// Resolve payment proof
																																							resolve(slate.getReceiverSignature());
																																						}
																																					}
																																					
																																					// Otherwise
																																					else {
																																					
																																						// Reject JSON-RPC internal error error response
																																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																					}
																																				});
																																			};
																																			
																																			// Return getting payment proof
																																			return getPaymentProof().then(function(paymentProof) {
																																			
																																				// Check if cancel didn't occur
																																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																			
																																					// Check if setting slate's receiver signature to the payment proof was successful
																																					if(slate.setReceiverSignature(paymentProof, wallet.getNetworkType() === Consensus.MAINNET_NETWORK_TYPE) === true) {
																																					
																																						// Try
																																						try {
																																						
																																							// Serialize the slate
																																							var serializedSlate = slate.serialize(wallet.getNetworkType() === Consensus.MAINNET_NETWORK_TYPE, Slate.COMPACT_SLATE_PURPOSE_SEND_RESPONSE);
																																						}
																																						
																																						// Catch errors
																																						catch(error) {
																																						
																																							// Reject JSON-RPC internal error error response
																																							reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																							
																																							// Return
																																							return;
																																						}
																																						
																																						// Return encoding slate
																																						return encodeSlate(serializedSlate).then(function(encodedSlate) {
																																					
																																							// Resolve
																																							resolve([
																																							
																																								// JSON-RPC response
																																								JsonRpc.createResponse({
																																	
																																									// Ok
																																									"Ok": encodedSlate
																																								
																																								}, data),
																																								
																																								// Method
																																								data["method"],
																																								
																																								// Additional data
																																								[
																																								
																																									// Slate
																																									slate,
																																									
																																									// Commit
																																									output[Wallet.OUTPUT_COMMIT_INDEX],
																																									
																																									// Identifier
																																									output[Wallet.OUTPUT_IDENTIFIER_INDEX],
																																									
																																									// Switch type
																																									output[Wallet.OUTPUT_SWITCH_TYPE_INDEX]
																																								]
																																							]);
																																						
																																						// Catch errors
																																						}).catch(function(error) {
																																						
																																							// Reject JSON-RPC internal error error response
																																							reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																						});
																																					}
																																					
																																					// Otherwise
																																					else {
																																					
																																						// Reject JSON-RPC internal error error response
																																						reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																					}
																																				}
																																				
																																				// Otherwise
																																				else {
																																				
																																					// Reject JSON-RPC internal error error response
																																					reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																				}
																																			
																																			// Catch errors
																																			}).catch(function(error) {
																																			
																																				// Check if cancel didn't occur
																																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																			
																																					// Reject error
																																					reject(error);
																																				}
																																				
																																				// Otherwise
																																				else {
																																				
																																					// Reject JSON-RPC internal error error response
																																					reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																				}
																																			});
																																		}
																																		
																																		// Otherwise
																																		else {
																																		
																																			// Reject JSON-RPC invalid parameters error response
																																			reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																																		}
																																	}
																																	
																																	// Otherwise
																																	else {
																																	
																																		// Reject JSON-RPC internal error error response
																																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																	}
																																
																																// Catch errors
																																}).catch(function(error) {
																																
																																	// Check if cancel didn't occur
																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																
																																		// Reject error
																																		reject(error);
																																	}
																																	
																																	// Otherwise
																																	else {
																																	
																																		// Reject JSON-RPC internal error error response
																																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																	}
																																});
																															}
																															
																															// Otherwise
																															else {
																															
																																// Try
																																try {
																																
																																	// Serialize the slate
																																	var serializedSlate = slate.serialize(wallet.getNetworkType() === Consensus.MAINNET_NETWORK_TYPE, Slate.COMPACT_SLATE_PURPOSE_SEND_RESPONSE);
																																}
																																
																																// Catch errors
																																catch(error) {
																																
																																	// Reject JSON-RPC internal error error response
																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																	
																																	// Return
																																	return;
																																}
																																
																																// Return encoding slate
																																return encodeSlate(serializedSlate).then(function(encodedSlate) {
																																
																																	// Resolve
																																	resolve([
																																	
																																		// JSON-RPC response
																																		JsonRpc.createResponse({
																											
																																			// Ok
																																			"Ok": encodedSlate
																																		
																																		}, data),
																																		
																																		// Method
																																		data["method"],
																																		
																																		// Additional data
																																		[
																																		
																																			// Slate
																																			slate,
																																			
																																			// Commit
																																			output[Wallet.OUTPUT_COMMIT_INDEX],
																																			
																																			// Identifier
																																			output[Wallet.OUTPUT_IDENTIFIER_INDEX],
																																			
																																			// Switch type
																																			output[Wallet.OUTPUT_SWITCH_TYPE_INDEX]
																																		]
																																	]);
																																
																																// Catch errors
																																}).catch(function(error) {
																																
																																	// Reject JSON-RPC internal error error response
																																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																																});
																															}
																														}
																														
																														// Otherwise
																														else {
																														
																															// Reject JSON-RPC internal error error response
																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																														}
																													
																													// Catch errors
																													}).catch(function(error) {
																													
																														// Check if cancel didn't occur
																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																													
																															// Reject error
																															reject(error);
																														}
																														
																														// Otherwise
																														else {
																														
																															// Reject JSON-RPC internal error error response
																															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																														}
																													});
																												}
																												
																												// Otherwise
																												else {
																												
																													// Reject JSON-RPC internal error error response
																													reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																												}
																												
																											// Catch errors
																											}).catch(function(error) {
																											
																												// Reject JSON-RPC internal error error response
																												reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																											});
																										}
																											
																										// Otherwise
																										else {
																										
																											// Reject JSON-RPC internal error error response
																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																										}
																									
																									// Catch errors
																									}).catch(function(error) {
																									
																										// Check if cancel didn't occur
																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																									
																											// Reject error
																											reject(error);
																										}
																											
																										// Otherwise
																										else {
																										
																											// Reject JSON-RPC internal error error response
																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																										}
																									});
																								
																								}
																						
																								// Otherwise
																								else {
																								
																									// Reject JSON-RPC invalid parameters error response
																									reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																								}
																							}
																							
																							// Otherwise
																							else {
																							
																								// Reject JSON-RPC internal error error response
																								reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																							}
																						
																						// Catch errors
																						}).catch(function(error) {
																						
																							// Reject JSON-RPC internal error error response
																							reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																						});
																					}
																					
																					// Otherwise
																					else {
																					
																						// Reject JSON-RPC invalid parameters error response
																						reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
																					}
																				}
																				
																				// Otherwise
																				else {
																				
																					// Reject JSON-RPC internal error error response
																					reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																				}
																			
																			// Catch errors
																			}).catch(function(error) {
																			
																				// Reject JSON-RPC internal error error response
																				reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																			});
																		}
																	}
																}
																
																// Otherwise
																else {
																
																	// Reject JSON-RPC internal error error response
																	reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																}
															
															// Catch errors
															}).catch(function(error) {
															
																// Reject JSON-RPC internal error error response
																reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
															});
														}
																		
														// Otherwise
														else {
														
															// Reject JSON-RPC internal error error response
															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
														}
														
													// Catch errors
													}).catch(function(error) {
													
														// Check if cancel didn't occur
														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
													
															// Reject error
															reject(error);
														}
														
														// Otherwise
														else {
														
															// Reject JSON-RPC internal error error response
															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
														}
													});
												}
												
												// Otherwise
												else {
												
													// Reject JSON-RPC invalid parameters error response
													reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
												}
											}
											
											// Otherwise
											else {
											
												// Reject JSON-RPC invalid request error response
												reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_REQUEST_ERROR, data));
											}
										
											// Break
											break;
										
										// Get proof address
										case Api.GET_PROOF_ADDRESS_METHOD:
										
											// Check if parameters are provided
											if(Array.isArray(data["params"]) === true) {
											
												// Check if the correct number of parameters are provided
												if(data["params"]["length"] === Api.GET_PROOF_ADDRESS_PARAMETERS_LENGTH) {
												
													// Get proof address
													var getProofAddress = function() {
													
														// Return promise
														return new Promise(function(resolve, reject) {
														
															// Check if cancel didn't occur
															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
														
																// Check if wallet isn't a hardware wallet
																if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																
																	// Check wallet type
																	switch(Consensus.getWalletType()) {
																	
																		// MWC wallet
																		case Consensus.MWC_WALLET_TYPE:
																
																			// Return wallet getting Tor proof address
																			return wallet.getTorProofAddress().then(function(proofAddress) {
																			
																				// Check if cancel didn't occur
																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																			
																					// Resolve proof address
																					resolve(proofAddress);
																				}
						
																				// Otherwise
																				else {
																				
																					// Reject JSON-RPC internal error error response
																					reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																				}
																					
																			// Catch errors
																			}).catch(function(error) {
																			
																				// Reject JSON-RPC internal error error response
																				reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																			});
																		
																		// GRIN wallet
																		case Consensus.GRIN_WALLET_TYPE:
																		
																			// Return wallet getting Slatepack proof address
																			return wallet.getSlatepackProofAddress().then(function(proofAddress) {
																			
																				// Check if cancel didn't occur
																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																			
																					// Resolve proof address
																					resolve(proofAddress);
																				}
						
																				// Otherwise
																				else {
																				
																					// Reject JSON-RPC internal error error response
																					reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																				}
																					
																			// Catch errors
																			}).catch(function(error) {
																			
																				// Reject JSON-RPC internal error error response
																				reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																			});
																	}
																}
																
																// Otherwise
																else {
														
																	// Return waiting for wallet's hardware wallet to connect
																	return self.wallets.waitForHardwareWalletToConnect(wallet.getKeyPath(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Connect the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Connect the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function() {
																	
																		// Check if cancel didn't occur
																		if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																		
																			// Check wallet type
																			switch(Consensus.getWalletType()) {
																			
																				// MWC wallet
																				case Consensus.MWC_WALLET_TYPE:
																	
																					// Return wallet getting Tor proof address
																					return wallet.getTorProofAddress((wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function(proofAddress) {
																					
																						// Check if cancel didn't occur
																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																					
																							// Resolve proof address
																							resolve(proofAddress);
																						}
						
																						// Otherwise
																						else {
																						
																							// Reject JSON-RPC internal error error response
																							reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																						}
																						
																					// Catch errors
																					}).catch(function(error) {
																					
																						// Check if cancel didn't occur
																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																					
																							// Check if hardware wallet was disconnected
																							if(error === HardwareWallet.DISCONNECTED_ERROR) {
																							
																								// Check if wallet's hardware wallet is connected
																								if(wallet.isHardwareConnected() === true) {
																							
																									// Wallet's hardware wallet disconnect event
																									$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																								
																										// Return getting proof address
																										return getProofAddress().then(function(proofAddress) {
																										
																											// Check if cancel didn't occur
																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																										
																												// Resolve proof address
																												resolve(proofAddress);
																											}
																											
																											// Otherwise
																											else {
																											
																												// Reject JSON-RPC internal error error response
																												reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																											}
																										
																										// Catch errors
																										}).catch(function(error) {
																										
																											// Check if cancel didn't occur
																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																										
																												// Reject error
																												reject(error);
																											}
																											
																											// Otherwise
																											else {
																											
																												// Reject JSON-RPC internal error error response
																												reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																											}
																										});
																									});
																								}
																								
																								// Otherwise
																								else {
																								
																									// Return getting proof address
																									return getProofAddress().then(function(proofAddress) {
																									
																										// Check if cancel didn't occur
																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																									
																											// Resolve proof address
																											resolve(proofAddress);
																										}
																										
																										// Otherwise
																										else {
																										
																											// Reject JSON-RPC internal error error response
																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																										}
																									
																									// Catch errors
																									}).catch(function(error) {
																									
																										// Check if cancel didn't occur
																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																									
																											// Reject error
																											reject(error);
																										}
																										
																										// Otherwise
																										else {
																										
																											// Reject JSON-RPC internal error error response
																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																										}
																									});
																								}
																							}
																							
																							// Otherwise
																							else {
																						
																								// Reject JSON-RPC internal error error response
																								reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																							}
																						}
																						
																						// Otherwise
																						else {
																						
																							// Reject JSON-RPC internal error error response
																							reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																						}
																					});
																				
																				// GRIN wallet
																				case Consensus.GRIN_WALLET_TYPE:
																				
																					// Return wallet getting Slatepack proof address
																					return wallet.getSlatepackProofAddress((wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue receiving a payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue receiving a payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], true, false, cancelOccurred).then(function(proofAddress) {
																					
																						// Check if cancel didn't occur
																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																					
																							// Resolve proof address
																							resolve(proofAddress);
																						}
						
																						// Otherwise
																						else {
																						
																							// Reject JSON-RPC internal error error response
																							reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																						}
																						
																					// Catch errors
																					}).catch(function(error) {
																					
																						// Check if cancel didn't occur
																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																					
																							// Check if hardware wallet was disconnected
																							if(error === HardwareWallet.DISCONNECTED_ERROR) {
																							
																								// Check if wallet's hardware wallet is connected
																								if(wallet.isHardwareConnected() === true) {
																							
																									// Wallet's hardware wallet disconnect event
																									$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																								
																										// Return getting proof address
																										return getProofAddress().then(function(proofAddress) {
																										
																											// Check if cancel didn't occur
																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																										
																												// Resolve proof address
																												resolve(proofAddress);
																											}
																											
																											// Otherwise
																											else {
																											
																												// Reject JSON-RPC internal error error response
																												reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																											}
																										
																										// Catch errors
																										}).catch(function(error) {
																										
																											// Check if cancel didn't occur
																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																										
																												// Reject error
																												reject(error);
																											}
																											
																											// Otherwise
																											else {
																											
																												// Reject JSON-RPC internal error error response
																												reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																											}
																										});
																									});
																								}
																								
																								// Otherwise
																								else {
																								
																									// Return getting proof address
																									return getProofAddress().then(function(proofAddress) {
																									
																										// Check if cancel didn't occur
																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																									
																											// Resolve proof address
																											resolve(proofAddress);
																										}
																										
																										// Otherwise
																										else {
																										
																											// Reject JSON-RPC internal error error response
																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																										}
																									
																									// Catch errors
																									}).catch(function(error) {
																									
																										// Check if cancel didn't occur
																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																									
																											// Reject error
																											reject(error);
																										}
																										
																										// Otherwise
																										else {
																										
																											// Reject JSON-RPC internal error error response
																											reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																										}
																									});
																								}
																							}
																							
																							// Otherwise
																							else {
																						
																								// Reject JSON-RPC internal error error response
																								reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																							}
																						}
																						
																						// Otherwise
																						else {
																						
																							// Reject JSON-RPC internal error error response
																							reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																						}
																					});
																			}
																		}
				
																		// Otherwise
																		else {
																		
																			// Reject JSON-RPC internal error error response
																			reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																		}
																		
																	// Catch errors
																	}).catch(function(error) {
																	
																		// Reject JSON-RPC internal error error response
																		reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
																	});
																}
															}
				
															// Otherwise
															else {
															
																// Reject JSON-RPC internal error error response
																reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
															}
														});
													};
												
													// Return wallet getting proof address
													return getProofAddress().then(function(proofAddress) {
													
														// Check if cancel didn't occur
														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
													
															// Resolve
															resolve([
															
																// JSON-RPC response
																JsonRpc.createResponse({
									
																	// Ok
																	"Ok": proofAddress
																	
																}, data),
																
																// Method
																data["method"],
																
																// Additional data
																Api.NO_ADDITIONAL_DATA
															]);
														}
														
														// Otherwise
														else {
														
															// Reject JSON-RPC internal error error response
															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
														}
													
													// Catch errors
													}).catch(function(error) {
													
														// Check if cancel didn't occur
														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
													
															// Reject error
															reject(error);
														}
														
														// Otherwise
														else {
														
															// Reject JSON-RPC internal error error response
															reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
														}
													});
												}
												
												// Otherwise
												else {
												
													// Reject JSON-RPC invalid parameters error response
													reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_PARAMETERS_ERROR, data));
												}
											}
											
											// Otherwise
											else {
											
												// Reject JSON-RPC invalid request error response
												reject(JsonRpc.createErrorResponse(JsonRpc.INVALID_REQUEST_ERROR, data));
											}
										
											// Break
											break;
										
										// Default
										default:
										
											// Reject JSON-RPC method not found error response
											reject(JsonRpc.createErrorResponse(JsonRpc.METHOD_NOT_FOUND_ERROR, data));
											
											// Break
											break;
									}
								}
							
								// Otherwise
								else {
								
									// Reject JSON-RPC internal error error response
									reject(JsonRpc.createErrorResponse(JsonRpc.INTERNAL_ERROR_ERROR, data));
								}
							}
							
							// Otherwise
							else {
							
								// Reject unsupported media type response
								reject(Listener.UNSUPPORTED_MEDIA_TYPE_RESPONSE);
							}
						}
						
						// Otherwise
						else {
						
							// Reject unsupported media type response
							reject(Listener.UNSUPPORTED_MEDIA_TYPE_RESPONSE);
						}
							
						// Break
						break;
						
					// Default
					default:
					
						// Reject not found response
						reject(Listener.NOT_FOUND_RESPONSE);
						
						// Break
						break;
				}
			});
		}
		
		// Get fee
		getFee(wallet, amount = Api.ALL_AMOUNT, baseFee = Api.DEFAULT_BASE_FEE, cancelOccurred = Common.NO_CANCEL_OCCURRED) {
		
			// Set self
			var self = this;
			
			// Return promise
			return new Promise(function(resolve, reject) {
			
				// Check if cancel didn't occur
				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
				
					// Check if amount is invalid
					if(amount !== Api.ALL_AMOUNT && amount.isLessThan(Slate.MINIMUM_AMOUNT) === true) {
					
						// Reject error
						reject(Language.getDefaultTranslation('The amount is invalid.'));
					}
					
					// Otherwise check if base fee is invalid
					else if(baseFee.isLessThan(Api.MINIMUM_BASE_FEE) === true) {
					
						// Reject error
						reject(Language.getDefaultTranslation('The base fee is invalid.'));
					}
					
					// Otherwise
					else {
		
						// Initialize total amount
						var totalAmount = new BigNumber(0);
						
						// Initialize number of inputs
						var numberOfInputs = 0;
						
						// Get fee, amount, and base fee
						var getFeeAmountAndBaseFee = function(transactionIndex) {
						
							// Return promise
							return new Promise(function(resolve, reject) {
							
								// Check if cancel didn't occur
								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
							
									// Check if amount is all amount
									if(amount === Api.ALL_AMOUNT) {
									
										// Return get all wallet's received released transactions
										return self.transactions.getWalletsReceivedReleasedTransactions(wallet.getKeyPath(), Database.GET_ALL_RESULTS, Database.GET_ALL_RESULTS).then(function(transactions) {
										
											// Check if cancel didn't occur
											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
										
												// Go through all transactions
												for(var i = 0; i < transactions["length"]; ++i) {
												
													// Get transaction
													var transaction = transactions[i];
													
													// Update total amount
													totalAmount = totalAmount.plus(transaction.getAmount());
													
													// Increment number of inputs
													++numberOfInputs;
												}
												
												// Get the fee
												var fee = Slate.getRequiredFee(numberOfInputs, 1, 1, baseFee);
												
												// Update the total amount to not include the fee
												totalAmount = totalAmount.minus(fee);
												
												// Check if the total amount is zero or less
												if(totalAmount.isLessThanOrEqualTo(0) === true) {
												
													// Reject error
													reject(Language.getDefaultTranslation('Insufficient balance.'));
												}
												
												// Otherwise check if fee is invalid
												else if(fee.isLessThan(Slate.MINIMUM_FEE) === true || fee.isGreaterThan(Slate.MAXIMUM_FEE) === true) {
												
													// Reject error
													reject(Language.getDefaultTranslation('The fee is invalid.'));
												}
												
												// Otherwise
												else {
												
													// Resolve
													resolve([
													
														// Fee
														fee,
														
														// Amount
														totalAmount,
														
														// Base fee
														baseFee
													]);
												}
											}
											
											// Otherwise
											else {
											
												// Reject canceled error
												reject(Common.CANCELED_ERROR);
											}
										
										// Catch errors
										}).catch(function(error) {
										
											// Check if cancel didn't occur
											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
										
												// Reject error
												reject(error);
											}
											
											// Otherwise
											else {
											
												// Reject canceled error
												reject(Common.CANCELED_ERROR);
											}
										});
									}
									
									// Otherwise
									else {
							
										// Return get a group of the wallet's received released transactions
										return self.transactions.getWalletsReceivedReleasedTransactions(wallet.getKeyPath(), transactionIndex, Api.SEND_TRANSACTIONS_GROUP_SIZE).then(function(transactions) {
										
											// Check if cancel didn't occur
											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
										
												// Go through all transactions or run at least once
												for(var i = 0; i < transactions["length"] || i === 0; ++i) {
												
													// Check if a transaction exists
													if(transactions["length"] !== 0) {
												
														// Get transaction
														var transaction = transactions[i];
														
														// Update total amount
														totalAmount = totalAmount.plus(transaction.getAmount());
														
														// Increment number of inputs
														++numberOfInputs;
													}
													
													// Get the fee with one output
													var fee = Slate.getRequiredFee(numberOfInputs, 1, 1, baseFee);
													
													// Get returned amount by subtracting the amount and fees from the total amount
													var returnedAmount = totalAmount.minus(amount.plus(fee));
													
													// Check if returned amount isn't zero
													if(returnedAmount.isZero() === false) {
													
														// Get fee with two outputs
														fee = Slate.getRequiredFee(numberOfInputs, 2, 1, baseFee);
													}
													
													// Check if total amount is enough to cover the amount and fee
													if((returnedAmount.isZero() === true && totalAmount.equalTo(amount.plus(fee)) === true) || (returnedAmount.isZero() === false && totalAmount.isGreaterThan(amount.plus(fee)) === true)) {
													
														// Check if fee is invalid
														if(fee.isLessThan(Slate.MINIMUM_FEE) === true || fee.isGreaterThan(Slate.MAXIMUM_FEE) === true) {
														
															// Reject error
															reject(Language.getDefaultTranslation('The fee is invalid.'));
															
															// Return
															return;
														}
														
														// Otherwise
														else {
													
															// Resolve
															resolve([
															
																// Fee
																fee,
																
																// Amount
																amount,
																
																// Base fee
																baseFee
															]);
													
															// Return
															return;
														}
													}
												
													// Otherwise check if at the last transaction or there were no transactions
													else if(i === transactions["length"] - 1 || transactions["length"] === 0) {
													
														// Check if no more transactions exist
														if(transactions["length"] !== Api.SEND_TRANSACTIONS_GROUP_SIZE) {
													
															// Reject error
															reject(Language.getDefaultTranslation('Insufficient balance.'));
															
															// Return
															return;
														}
													}
												}
												
												// Return getting fee, amount, and base fee
												return getFeeAmountAndBaseFee(transactionIndex + Api.SEND_TRANSACTIONS_GROUP_SIZE).then(function(feeAmountAndBaseFee) {
												
													// Check if cancel didn't occur
													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
												
														// Resolve fee, amount, and base fee
														resolve(feeAmountAndBaseFee);
													}
													
													// Otherwise
													else {
													
														// Reject canceled error
														reject(Common.CANCELED_ERROR);
													}
												
												// Catch errors
												}).catch(function(error) {
												
													// Check if cancel didn't occur
													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
												
														// Reject error
														reject(error);
													}
													
													// Otherwise
													else {
													
														// Reject canceled error
														reject(Common.CANCELED_ERROR);
													}
												});
											}
											
											// Otherwise
											else {
											
												// Reject canceled error
												reject(Common.CANCELED_ERROR);
											}
										
										// Catch errors
										}).catch(function(error) {
										
											// Check if cancel didn't occur
											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
										
												// Reject error
												reject(error);
											}
											
											// Otherwise
											else {
											
												// Reject canceled error
												reject(Common.CANCELED_ERROR);
											}
										});
									}
								}
								
								// Otherwise
								else {
								
									// Reject canceled error
									reject(Common.CANCELED_ERROR);
								}
							});
						};
						
						// Return getting fee, amount, and base fee
						return getFeeAmountAndBaseFee(0).then(function(feeAmountAndBaseFee) {
						
							// Check if cancel didn't occur
							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
						
								// Resolve fee, amount, and base fee
								resolve(feeAmountAndBaseFee);
							}
							
							// Otherwise
							else {
							
								// Reject canceled error
								reject(Common.CANCELED_ERROR);
							}
						
						// Catch errors
						}).catch(function(error) {
						
							// Check if cancel didn't occur
							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
						
								// Reject error
								reject(error);
							}
							
							// Otherwise
							else {
							
								// Reject canceled error
								reject(Common.CANCELED_ERROR);
							}
						});
					}
				}
				
				// Otherwise
				else {
				
					// Reject canceled error
					reject(Common.CANCELED_ERROR);
				}
			});
		}
		
		// Send
		send(wallet, url, amount, fee, baseFee = Api.DEFAULT_BASE_FEE, numberOfConfirmations = Api.DEFAULT_NUMBER_OF_CONFIRMATIONS, message = SlateParticipant.NO_MESSAGE, lockHeight = Slate.NO_LOCK_HEIGHT, relativeHeight = Slate.NO_RELATIVE_HEIGHT, timeToLiveCutOffHeight = Slate.NO_TIME_TO_LIVE_CUT_OFF_HEIGHT, cancelOccurred = Common.NO_CANCEL_OCCURRED) {
		
			// Set self
			var self = this;
			
			// Return promise
			return new Promise(function(resolve, reject) {
			
				// Check if cancel didn't occur
				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
				
					// Get current height
					var currentHeight = self.node.getCurrentHeight().getHeight();
					
					// Check if current height doesn't exist or the node isn't synced
					if(currentHeight === Node.UNKNOWN_HEIGHT || currentHeight.isEqualTo(Consensus.FIRST_BLOCK_HEIGHT) === true) {
					
						// Reject error
						reject(Message.createText(Language.getDefaultTranslation('The current height is unknown.')));
					}
					
					// Otherwise
					else {
					
						// Check if amount is invalid
						if(amount.isLessThan(Slate.MINIMUM_AMOUNT) === true) {
						
							// Reject error
							reject(Message.createText(Language.getDefaultTranslation('The amount is invalid.')));
							
							// Return
							return;
						}
					
						// Check if fee is invalid
						if(fee.isLessThan(Slate.MINIMUM_FEE) === true || fee.isGreaterThan(Slate.MAXIMUM_FEE) === true) {
						
							// Reject error
							reject(Message.createText(Language.getDefaultTranslation('The fee is invalid.')));
							
							// Return
							return;
						}
						
						// Check if base fee is invalid
						if(baseFee.isLessThan(Api.MINIMUM_BASE_FEE) === true) {
						
							// Reject error
							reject(Message.createText(Language.getDefaultTranslation('The base fee is invalid.')));
							
							// Return
							return;
						}
					
						// Check if time to live cut off height exists
						if(timeToLiveCutOffHeight !== Slate.NO_TIME_TO_LIVE_CUT_OFF_HEIGHT) {
						
							// Change relative time to live cut off height to be absolute
							timeToLiveCutOffHeight = currentHeight.plus(timeToLiveCutOffHeight);
							
							// Check if time to live cut off height isn't greater than the current height
							if(timeToLiveCutOffHeight.isLessThanOrEqualTo(currentHeight) === true) {
							
								// Reject error
								reject(Message.createText(Language.getDefaultTranslation('The time to live cut off height must be greater than the current height.')));
								
								// Return
								return;
							}
							
							// Check if lock height exists and time to live cut off height isn't greater than or equal to it
							if(lockHeight.isEqualTo(Slate.NO_LOCK_HEIGHT) === false && timeToLiveCutOffHeight.isLessThan(lockHeight) === true) {
							
								// Reject error
								reject(Message.createText(Language.getDefaultTranslation('The time to live cut off height must be greater than or equal to the lock height.')));
								
								// Return
								return;
							}
						}
						
						// Check if relative height exists and no recent duplicate kernels isn't enabled or the relative height is invalid
						if(relativeHeight !== Slate.NO_RELATIVE_HEIGHT && (Consensus.isNoRecentDuplicateKernelsEnabled(wallet.getNetworkType() === Consensus.MAINNET_NETWORK_TYPE) === false || relativeHeight.isLessThan(SlateKernel.MINIMUM_RECENT_HEIGHT) === true || relativeHeight.isGreaterThan(SlateKernel.MAXIMUM_RECENT_HEIGHT) === true)) {
						
							// Reject error
							reject(Message.createText(Language.getDefaultTranslation('The relative height is invalid.')));
							
							// Return
							return;
						}
			
						// Initialize inputs
						var inputs = [];
					
						// Initialize total amount
						var totalAmount = new BigNumber(0);
						
						// Initialize updated transactions
						var updatedTransactions = [];
						
						// Get inputs
						var getInputs = function(transactionIndex) {
						
							// Return promise
							return new Promise(function(resolve, reject) {
							
								// Check if cancel didn't occur
								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
						
									// Return get all wallet's received released transactions
									return self.transactions.getWalletsReceivedReleasedTransactions(wallet.getKeyPath(), transactionIndex, Api.SEND_TRANSACTIONS_GROUP_SIZE).then(function(transactions) {
									
										// Check if cancel didn't occur
										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
									
											// Go through all transactions or run at least once
											for(var i = 0; i < transactions["length"] || i === 0; ++i) {
											
												// Check if a transaction exists
												if(transactions["length"] !== 0) {
											
													// Get transaction
													var transaction = transactions[i];
													
													// Append transaction to inputs
													inputs.push([
													
														// Amount
														transaction.getAmount(),
														
														// Identifier
														transaction.getIdentifier(),
														
														// Switch type
														transaction.getSwitchType(),
														
														// Features
														(transaction.getIsCoinbase() === true) ? SlateInput.COINBASE_FEATURES : SlateInput.PLAIN_FEATURES,
														
														// Commit
														transaction.getCommit(),
														
														// Key path
														transaction.getKeyPath()
													]);
													
													// Update total amount
													totalAmount = totalAmount.plus(transaction.getAmount());
													
													// Set that transaction's status is locked
													transaction.setStatus(Transaction.STATUS_LOCKED);
													
													// Append transaction to list
													updatedTransactions.push(transaction);
												}
												
												// Check if total amount is enough to cover the amount and fee
												if(totalAmount.isGreaterThanOrEqualTo(amount.plus(fee)) === true) {
												
													// Resolve
													resolve();
												
													// Return
													return;
												}
											
												// Otherwise check if at the last transaction or there were no transactions
												else if(i === transactions["length"] - 1 || transactions["length"] === 0) {
												
													// Check if no more transactions exist
													if(transactions["length"] !== Api.SEND_TRANSACTIONS_GROUP_SIZE) {
												
														// Reject error
														reject(Message.createText(Language.getDefaultTranslation('Insufficient balance.')));
														
														// Return
														return;
													}
												}
											}
											
											// Return getting inputs
											return getInputs(transactionIndex + Api.SEND_TRANSACTIONS_GROUP_SIZE).then(function() {
											
												// Check if cancel didn't occur
												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
											
													// Resolve
													resolve();
												}
												
												// Otherwise
												else {
												
													// Reject canceled error
													reject(Common.CANCELED_ERROR);
												}
											
											// Catch errors
											}).catch(function(error) {
											
												// Check if cancel didn't occur
												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
											
													// Reject error
													reject(error);
												}
												
												// Otherwise
												else {
												
													// Reject canceled error
													reject(Common.CANCELED_ERROR);
												}
											});
										}
										
										// Otherwise
										else {
										
											// Reject canceled error
											reject(Common.CANCELED_ERROR);
										}
									
									// Catch errors
									}).catch(function(error) {
									
										// Check if cancel didn't occur
										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
									
											// Reject error
											reject(Message.createText(error));
										}
								
										// Otherwise
										else {
										
											// Reject canceled error
											reject(Common.CANCELED_ERROR);
										}
									});
								}
								
								// Otherwise
								else {
								
									// Reject canceled error
									reject(Common.CANCELED_ERROR);
								}
							});
						};
						
						// Return getting inputs
						return getInputs(0).then(function() {
						
							// Check if cancel didn't occur
							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
						
								// Check wallet type
								switch(Consensus.getWalletType()) {
								
									// MWC wallet
									case Consensus.MWC_WALLET_TYPE:
							
										// Initialize error occurred
										var errorOccurred = false;
									
										// Try
										try {
										
											// Get receiver's Tor address from URL
											var receiverTorAddress = Tor.getTorAddressFromUrl(url);
										}
										
										// Catch errors
										catch(error) {
										
											// Set error occurred
											errorOccurred = true;
										}
										
										// Check if an error didn't occur
										if(errorOccurred === false) {
										
											// Set receiver URL to the URL with a Tor protocol and top-level domain added if needed
											var receiverUrl = ((Common.urlContainsProtocol(url) === false) ? Common.HTTP_PROTOCOL + "//" : "") + url + ((Common.urlContainsProtocol(url) === false && Common.urlContainsTopLevelDomain(url) === false) ? Tor.URL_TOP_LEVEL_DOMAIN : "");
										}
										
										// Otherwise
										else {
										
											// Set receiver URL to url
											var receiverUrl = url;
										}
										
										// break
										break;
									
									// GRIN wallet
									case Consensus.GRIN_WALLET_TYPE:
									
										// Initialize error occurred
										var errorOccurred = false;
									
										// Try
										try {
										
											// Parse the URL as a Slatepack address
											var receiverPublicKey = Slatepack.slatepackAddressToPublicKey(url);
										}
										
										// Catch errors
										catch(error) {
										
											// Set error occurred
											errorOccurred = true;
										}
										
										// Check if an error didn't occur
										if(errorOccurred === false) {
										
											// Set receiver URL to the receiver's public key as a Tor address with a Tor protocol and top-level domain added
											var receiverUrl = Common.HTTP_PROTOCOL + "//" + Tor.publicKeyToTorAddress(receiverPublicKey) + Tor.URL_TOP_LEVEL_DOMAIN;
										}
										
										// Otherwise
										else {
										
											// Set receiver URL to url
											var receiverUrl = url;
										}
									
										// Break
										break;
								}
								
								// Check if receiver URL doesn't have a protocol
								if(Common.urlContainsProtocol(receiverUrl) === false) {
								
									// Add protocol to receiver URL
									receiverUrl = Common.HTTP_PROTOCOL + "//" + receiverUrl;
								}
						
								// Try
								try {
								
									// Parse receiver URL
									var parsedUrl = new URL(receiverUrl);
								}
								
								// Catch errors
								catch(error) {
								
									// Reject error
									reject(Message.createText(Language.getDefaultTranslation('Recipient address isn\'t supported.')));
									
									// Return
									return;
								}
								
								// Return checking if device is compatible
								return self.isCompatible(receiverUrl, cancelOccurred).then(function(compatibleSlateVersions) {
								
									// Check if cancel didn't occur
									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
									
										// Get receiver address
										var getReceiverAddress = function() {
										
											// Return promise
											return new Promise(function(resolve, reject) {
											
												// Check if cancel didn't occur
												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
												
													// Check wallet type
													switch(Consensus.getWalletType()) {
													
														// MWC wallet
														case Consensus.MWC_WALLET_TYPE:
														
															// Initialize error occurred
															var errorOccurred = false;
														
															// Try
															try {
															
																// Get receiver's public key from URL
																var receiverPublicKey = Tor.torAddressToPublicKey(url);
															}
															
															// Catch errors
															catch(error) {
															
																// Set error occurred
																errorOccurred = true;
															}
															
															// Check if an error didn't occur
															if(errorOccurred === false) {
														
																// Resolve the receiver's public key as a Tor address
																resolve(Tor.publicKeyToTorAddress(receiverPublicKey));
															}
															
															// Otherwise
															else {
															
																// Set use proof address to if version three, three B, and Slatepack slates are supported
																var useProofAddress = compatibleSlateVersions.indexOf("V" + Slate.VERSION_THREE.toFixed()) !== Common.INDEX_NOT_FOUND || compatibleSlateVersions.indexOf("V" + Slate.VERSION_THREE.toFixed() + "B") !== Common.INDEX_NOT_FOUND || compatibleSlateVersions.indexOf(Slate.VERSION_SLATEPACK) !== Common.INDEX_NOT_FOUND;
																
																// Check if using proof address
																if(useProofAddress === true) {
											
																	// Return getting proof address
																	return self.getProofAddress(receiverUrl, wallet.getNetworkType() === Consensus.MAINNET_NETWORK_TYPE, cancelOccurred).then(function(receiverAddress) {
																	
																		// Check if cancel didn't occur
																		if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																		
																			// Resolve receiver address
																			resolve(receiverAddress);
																		}
																		
																		// Otherwise
																		else {
																		
																			// Reject canceled error
																			reject(Common.CANCELED_ERROR);
																		}
																		
																	// Catch errors
																	}).catch(function(error) {
																	
																		// Check if cancel didn't occur
																		if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																		
																			// Reject error
																			reject(error);
																		}
																		
																		// Otherwise
																		else {
																		
																			// Reject canceled error
																			reject(Common.CANCELED_ERROR);
																		}
																	});
																}
																
																// Otherwise
																else {
																
																	// Resolve no proof address
																	resolve(Api.NO_PROOF_ADDRESS);
																}
															}
															
															// Break
															break;
														
														// GRIN wallet
														case Consensus.GRIN_WALLET_TYPE:
														
															// Try
															try {
															
																// Get receiver's public key from URL
																var receiverPublicKey = Slatepack.slatepackAddressToPublicKey(url);
															}
															
															// Catch errors
															catch(error) {
															
																// Resolve no proof address
																resolve(Api.NO_PROOF_ADDRESS);
																
																// Return
																return;
															}
															
															// Resolve the receiver's public key as a Slatepack address
															resolve(Slatepack.publicKeyToSlatepackAddress(receiverPublicKey));
														
															// Break
															break;
													}
												}
												
												// Otherwise
												else {
												
													// Reject canceled error
													reject(Common.CANCELED_ERROR);
												}
											});
										};
										
										// Return getting receiver address
										return getReceiverAddress().then(function(receiverAddress) {
									
											// Check if cancel didn't occur
											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
											
												// Check if payment proof is required and receiver address doesn't exist
												if(self.requirePaymentProof === true && receiverAddress === Api.NO_PROOF_ADDRESS) {
												
													// Reject unsupported response
													reject(Message.createText(Language.getDefaultTranslation('Recipient doesn\'t support payment proofs.')));
												}
												
												// Otherwise
												else {
												
													// Get sender address
													var getSenderAddress = function() {
													
														// Return promise
														return new Promise(function(resolve, reject) {
														
															// Check if cancel didn't occur
															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
															
																// Set use Tor proof address to if version three B or Slatepack slates are supported
																var useTorProofAddress = compatibleSlateVersions.indexOf("V" + Slate.VERSION_THREE.toFixed() + "B") !== Common.INDEX_NOT_FOUND || compatibleSlateVersions.indexOf(Slate.VERSION_SLATEPACK) !== Common.INDEX_NOT_FOUND;
															
																// Check if proof address is supported by the receiver
																if(receiverAddress !== Api.NO_PROOF_ADDRESS) {
														
																	// Check if wallet isn't a hardware wallet
																	if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																	
																		// Check wallet type
																		switch(Consensus.getWalletType()) {
																		
																			// MWC wallet
																			case Consensus.MWC_WALLET_TYPE:
																	
																				// Check if use Tor proof address
																				if(useTorProofAddress === true) {
																			
																					// Return wallet getting Tor proof address
																					return wallet.getTorProofAddress().then(function(senderAddress) {
																					
																						// Check if cancel didn't occur
																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																					
																							// resolve sender address
																							resolve(senderAddress);
																						}
																						
																						// Otherwise
																						else {
																						
																							// Reject canceled error
																							reject(Common.CANCELED_ERROR);
																						}
																					
																					// Catch errors
																					}).catch(function(error) {
																					
																						// Check if cancel didn't occur
																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																						
																							// Reject error
																							reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																						}
																						
																						// Otherwise
																						else {
																						
																							// Reject canceled error
																							reject(Common.CANCELED_ERROR);
																						}
																					});
																				}
																				
																				// Otherwise
																				else {
																				
																					// Return wallet getting MQS proof address
																					return wallet.getMqsProofAddress().then(function(senderAddress) {
																					
																						// Check if cancel didn't occur
																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																					
																							// resolve sender address
																							resolve(senderAddress);
																						}
																						
																						// Otherwise
																						else {
																						
																							// Reject canceled error
																							reject(Common.CANCELED_ERROR);
																						}
																					
																					// Catch errors
																					}).catch(function(error) {
																					
																						// Check if cancel didn't occur
																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																						
																							// Reject error
																							reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																						}
																						
																						// Otherwise
																						else {
																						
																							// Reject canceled error
																							reject(Common.CANCELED_ERROR);
																						}
																					});
																				}
																			
																			// GRIN wallet
																			case Consensus.GRIN_WALLET_TYPE:
																			
																				// Return wallet getting Slatepack proof address
																				return wallet.getSlatepackProofAddress().then(function(senderAddress) {
																				
																					// Check if cancel didn't occur
																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																				
																						// resolve sender address
																						resolve(senderAddress);
																					}
																					
																					// Otherwise
																					else {
																					
																						// Reject canceled error
																						reject(Common.CANCELED_ERROR);
																					}
																				
																				// Catch errors
																				}).catch(function(error) {
																				
																					// Check if cancel didn't occur
																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																					
																						// Reject error
																						reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																					}
																					
																					// Otherwise
																					else {
																					
																						// Reject canceled error
																						reject(Common.CANCELED_ERROR);
																					}
																				});
																		}
																	}
																	
																	// Otherwise
																	else {
																	
																		// Return waiting for wallet's hardware wallet to connect
																		return self.wallets.waitForHardwareWalletToConnect(wallet.getKeyPath(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Connect the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Connect the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function() {
																		
																			// Check if cancel didn't occur
																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																			
																				// Check wallet type
																				switch(Consensus.getWalletType()) {
																				
																					// MWC wallet
																					case Consensus.MWC_WALLET_TYPE:
																			
																						// Check if use Tor proof address
																						if(useTorProofAddress === true) {
																				
																							// Return wallet getting Tor proof address
																							return wallet.getTorProofAddress((wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function(senderAddress) {
																							
																								// Check if cancel didn't occur
																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																							
																									// resolve sender address
																									resolve(senderAddress);
																								}
																								
																								// Otherwise
																								else {
																								
																									// Reject canceled error
																									reject(Common.CANCELED_ERROR);
																								}
																							
																							// Catch errors
																							}).catch(function(error) {
																							
																								// Check if cancel didn't occur
																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																							
																									// Check if hardware wallet was disconnected
																									if(error === HardwareWallet.DISCONNECTED_ERROR) {
																									
																										// Check if wallet's hardware wallet is connected
																										if(wallet.isHardwareConnected() === true) {
																									
																											// Wallet's hardware wallet disconnect event
																											$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																										
																												// Return getting sender address
																												return getSenderAddress().then(function(senderAddress) {
																												
																													// Check if cancel didn't occur
																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																												
																														// Resolve sender address
																														resolve(senderAddress);
																													}
																													
																													// Otherwise
																													else {
																													
																														// Reject canceled error
																														reject(Common.CANCELED_ERROR);
																													}
																												
																												// Catch errors
																												}).catch(function(error) {
																												
																													// Check if cancel didn't occur
																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																												
																														// Reject error
																														reject(error);
																													}
																													
																													// Otherwise
																													else {
																													
																														// Reject canceled error
																														reject(Common.CANCELED_ERROR);
																													}
																												});
																											});
																										}
																										
																										// Otherwise
																										else {
																										
																											// Return getting sender address
																											return getSenderAddress().then(function(senderAddress) {
																											
																												// Check if cancel didn't occur
																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																											
																													// Resolve sender address
																													resolve(senderAddress);
																												}
																												
																												// Otherwise
																												else {
																												
																													// Reject canceled error
																													reject(Common.CANCELED_ERROR);
																												}
																											
																											// Catch errors
																											}).catch(function(error) {
																											
																												// Check if cancel didn't occur
																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																											
																													// Reject error
																													reject(error);
																												}
																												
																												// Otherwise
																												else {
																												
																													// Reject canceled error
																													reject(Common.CANCELED_ERROR);
																												}
																											});
																										}
																									}
																									
																									// Otherwise check if canceled
																									else if(error === Common.CANCELED_ERROR) {
																									
																										// Reject error
																										reject(error);
																									}
																									
																									// Otherwise
																									else {
																									
																										// Reject error
																										reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																									}
																								}
																								
																								// Otherwise
																								else {
																								
																									// Reject canceled error
																									reject(Common.CANCELED_ERROR);
																								}
																							});
																						}
																						
																						// Otherwise
																						else {
																						
																							// Return wallet getting MQS proof address
																							return wallet.getMqsProofAddress((wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function(senderAddress) {
																							
																								// Check if cancel didn't occur
																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																							
																									// resolve sender address
																									resolve(senderAddress);
																								}
																								
																								// Otherwise
																								else {
																								
																									// Reject canceled error
																									reject(Common.CANCELED_ERROR);
																								}
																							
																							// Catch errors
																							}).catch(function(error) {
																							
																								// Check if cancel didn't occur
																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																							
																									// Check if hardware wallet was disconnected
																									if(error === HardwareWallet.DISCONNECTED_ERROR) {
																									
																										// Check if wallet's hardware wallet is connected
																										if(wallet.isHardwareConnected() === true) {
																									
																											// Wallet's hardware wallet disconnect event
																											$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																										
																												// Return getting sender address
																												return getSenderAddress().then(function(senderAddress) {
																												
																													// Check if cancel didn't occur
																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																												
																														// Resolve sender address
																														resolve(senderAddress);
																													}
																													
																													// Otherwise
																													else {
																													
																														// Reject canceled error
																														reject(Common.CANCELED_ERROR);
																													}
																												
																												// Catch errors
																												}).catch(function(error) {
																												
																													// Check if cancel didn't occur
																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																												
																														// Reject error
																														reject(error);
																													}
																													
																													// Otherwise
																													else {
																													
																														// Reject canceled error
																														reject(Common.CANCELED_ERROR);
																													}
																												});
																											});
																										}
																										
																										// Otherwise
																										else {
																										
																											// Return getting sender address
																											return getSenderAddress().then(function(senderAddress) {
																											
																												// Check if cancel didn't occur
																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																											
																													// Resolve sender address
																													resolve(senderAddress);
																												}
																												
																												// Otherwise
																												else {
																												
																													// Reject canceled error
																													reject(Common.CANCELED_ERROR);
																												}
																											
																											// Catch errors
																											}).catch(function(error) {
																											
																												// Check if cancel didn't occur
																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																											
																													// Reject error
																													reject(error);
																												}
																												
																												// Otherwise
																												else {
																												
																													// Reject canceled error
																													reject(Common.CANCELED_ERROR);
																												}
																											});
																										}
																									}
																									
																									// Otherwise check if canceled
																									else if(error === Common.CANCELED_ERROR) {
																									
																										// Reject error
																										reject(error);
																									}
																									
																									// Otherwise
																									else {
																									
																										// Reject error
																										reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																									}
																								}
																								
																								// Otherwise
																								else {
																								
																									// Reject canceled error
																									reject(Common.CANCELED_ERROR);
																								}
																							});
																						}
																					
																					// GRIN wallet
																					case Consensus.GRIN_WALLET_TYPE:
																					
																						// Return wallet getting Slatepack proof address
																						return wallet.getSlatepackProofAddress((wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function(senderAddress) {
																						
																							// Check if cancel didn't occur
																							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																						
																								// resolve sender address
																								resolve(senderAddress);
																							}
																							
																							// Otherwise
																							else {
																							
																								// Reject canceled error
																								reject(Common.CANCELED_ERROR);
																							}
																						
																						// Catch errors
																						}).catch(function(error) {
																						
																							// Check if cancel didn't occur
																							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																						
																								// Check if hardware wallet was disconnected
																								if(error === HardwareWallet.DISCONNECTED_ERROR) {
																								
																									// Check if wallet's hardware wallet is connected
																									if(wallet.isHardwareConnected() === true) {
																								
																										// Wallet's hardware wallet disconnect event
																										$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																									
																											// Return getting sender address
																											return getSenderAddress().then(function(senderAddress) {
																											
																												// Check if cancel didn't occur
																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																											
																													// Resolve sender address
																													resolve(senderAddress);
																												}
																												
																												// Otherwise
																												else {
																												
																													// Reject canceled error
																													reject(Common.CANCELED_ERROR);
																												}
																											
																											// Catch errors
																											}).catch(function(error) {
																											
																												// Check if cancel didn't occur
																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																											
																													// Reject error
																													reject(error);
																												}
																												
																												// Otherwise
																												else {
																												
																													// Reject canceled error
																													reject(Common.CANCELED_ERROR);
																												}
																											});
																										});
																									}
																									
																									// Otherwise
																									else {
																									
																										// Return getting sender address
																										return getSenderAddress().then(function(senderAddress) {
																										
																											// Check if cancel didn't occur
																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																										
																												// Resolve sender address
																												resolve(senderAddress);
																											}
																											
																											// Otherwise
																											else {
																											
																												// Reject canceled error
																												reject(Common.CANCELED_ERROR);
																											}
																										
																										// Catch errors
																										}).catch(function(error) {
																										
																											// Check if cancel didn't occur
																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																										
																												// Reject error
																												reject(error);
																											}
																											
																											// Otherwise
																											else {
																											
																												// Reject canceled error
																												reject(Common.CANCELED_ERROR);
																											}
																										});
																									}
																								}
																								
																								// Otherwise check if canceled
																								else if(error === Common.CANCELED_ERROR) {
																								
																									// Reject error
																									reject(error);
																								}
																								
																								// Otherwise
																								else {
																								
																									// Reject error
																									reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																								}
																							}
																							
																							// Otherwise
																							else {
																							
																								// Reject canceled error
																								reject(Common.CANCELED_ERROR);
																							}
																						});
																				}
																			}
																			
																			// Otherwise
																			else {
																			
																				// Reject canceled error
																				reject(Common.CANCELED_ERROR);
																			}
																			
																		// Catch errors
																		}).catch(function(error) {
																		
																			// Check if cancel didn't occur
																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																		
																				// Check if canceled
																				if(error === Common.CANCELED_ERROR) {
																				
																					// Reject error
																					reject(error);
																				}
																				
																				// Otherwise
																				else {
																				
																					// Reject error
																					reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																				}
																			}
																			
																			// Otherwise
																			else {
																			
																				// Reject canceled error
																				reject(Common.CANCELED_ERROR);
																			}
																		});
																	}
																}
																
																// Otherwise
																else {
																
																	// Resolve no sender address
																	resolve(Slate.NO_SENDER_ADDRESS);
																}
															}
															
															// Otherwise
															else {
															
																// Reject canceled error
																reject(Common.CANCELED_ERROR);
															}
														});
													};
												
													// Return getting sender address
													return getSenderAddress().then(function(senderAddress) {
													
														// Check if cancel didn't occur
														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
													
															// Try
															try {
															
																// Check if proof address is supported by the receiver
																if(receiverAddress !== Api.NO_PROOF_ADDRESS) {
																
																	// Create slate with payment proof
																	var slate = new Slate(amount, wallet.getNetworkType() === Consensus.MAINNET_NETWORK_TYPE, fee, currentHeight, lockHeight, relativeHeight, timeToLiveCutOffHeight, senderAddress, receiverAddress, compatibleSlateVersions);
																}
																
																// Otherwise
																else {
														
																	// Create slate without payment proof
																	var slate = new Slate(amount, wallet.getNetworkType() === Consensus.MAINNET_NETWORK_TYPE, fee, currentHeight, lockHeight, relativeHeight, timeToLiveCutOffHeight, Slate.NO_SENDER_ADDRESS, Slate.NO_RECEIVER_ADDRESS, compatibleSlateVersions);
																}
															}
															
															// Catch errors
															catch(error) {
															
																// Reject error
																reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																
																// Return
																return;
															}
															
															// Check if slate isn't supported
															if(compatibleSlateVersions.indexOf((slate.getVersion() instanceof BigNumber === true) ? "V" + slate.getVersion().toFixed() : slate.getVersion()) === Common.INDEX_NOT_FOUND) {
															
																// Reject unsupported response
																reject(Message.createText(Language.getDefaultTranslation('Recipient doesn\'t support any available slate versions.')));
															}
															
															// Otherwise
															else {
															
																// Make ID unique
																var makeIdUnique = function() {
																
																	// Return promise
																	return new Promise(function(resolve, reject) {
																	
																		// Check if cancel didn't occur
																		if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																		
																			// Return getting a transaction for the wallet with the same ID
																			return self.transactions.getWalletsTransactionWithId(wallet.getKeyPath(), slate.getId()).then(function(transaction) {
																			
																				// Check if cancel didn't occur
																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																			
																					// Check if a transaction for the wallet with the same ID doesn't exist
																					if(transaction === Transactions.NO_TRANSACTION_FOUND) {
																					
																						// Resolve
																						resolve();
																					}
																					
																					// Otherwise
																					else {
																					
																						// Change slate's ID
																						slate.changeId();
																					
																						// Return making ID unique
																						return makeIdUnique().then(function() {
																						
																							// Check if cancel didn't occur
																							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																							
																								// Resolve
																								resolve();
																							}
																				
																							// Otherwise
																							else {
																							
																								// Reject canceled error
																								reject(Common.CANCELED_ERROR);
																							}
																						
																						// Catch errors
																						}).catch(function(error) {
																						
																							// Check if cancel didn't occur
																							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																							
																								// Reject error
																								reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																							}
																							
																							// Otherwise
																							else {
																							
																								// Reject canceled error
																								reject(Common.CANCELED_ERROR);
																							}
																						});
																					}
																				}
																				
																				// Otherwise
																				else {
																				
																					// Reject canceled error
																					reject(Common.CANCELED_ERROR);
																				}
																			
																			// Catch errors
																			}).catch(function(error) {
																			
																				// Check if cancel didn't occur
																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																				
																					// Reject error
																					reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																				}
																				
																				// Otherwise
																				else {
																				
																					// Reject canceled error
																					reject(Common.CANCELED_ERROR);
																				}
																			});
																		}
																		
																		// Otherwise
																		else {
																		
																			// Reject canceled error
																			reject(Common.CANCELED_ERROR);
																		}
																	});
																};
																
																// Return making ID unique
																return makeIdUnique().then(function() {
																
																	// Check if cancel didn't occur
																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																	
																		// Get returned amount by subtracting the amount and fees from the total amount
																		var returnedAmount = totalAmount.minus(amount.plus(fee));
																		
																		// Set number of change outputs
																		var numberOfChangeOutputs = (returnedAmount.isZero() === true) ? 0 : 1;
																		
																		// Return adding inputs to the slate
																		return Slate.addInputsAsynchronous(slate, inputs.map(function(input) {
																		
																			// Return slate input from the input
																			return new SlateInput(input[Wallet.INPUT_FEATURES_INDEX], input[Wallet.INPUT_COMMIT_INDEX]);
																		
																		}), true, numberOfChangeOutputs + 1).then(function(slate) {
																		
																			// Check if cancel didn't occur
																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																				
																				// Get output
																				var getOutput = function() {
																				
																					// Return promise
																					return new Promise(function(resolve, reject) {
																					
																						// Check if cancel didn't occur
																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																						
																							// Check if returned amount is zero
																							if(returnedAmount.isZero() === true) {
																							
																								// Resolve
																								resolve();
																							}
																							
																							// Otherwise
																							else {
																				
																								// Build output
																								var buildOutput = function() {
																								
																									// Return promise
																									return new Promise(function(resolve, reject) {
																									
																										// Check if cancel didn't occur
																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																									
																											// Return wallet building output
																											return wallet.buildOutput(returnedAmount, (lockHeight.isEqualTo(Slate.NO_LOCK_HEIGHT) === true || lockHeight.isLessThan(currentHeight) === true) ? currentHeight : lockHeight, HardwareWallet.SENDING_TRANSACTION_MESSAGE, (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function(output) {
																											
																												// Check if cancel didn't occur
																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																											
																													// Return getting a transaction with the output's commit
																													return self.transactions.getTransaction(wallet.getWalletType(), wallet.getNetworkType(), output[Wallet.OUTPUT_COMMIT_INDEX]).then(function(transaction) {
																													
																														// Check if cancel didn't occur
																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																													
																															// Check if a transaction with the same commit doesn't exist
																															if(transaction === Transactions.NO_TRANSACTION_FOUND) {
																													
																																// Resolve output
																																resolve(output);
																															}
																															
																															// Otherwise
																															else {
																															
																																// Return building output
																																return buildOutput().then(function(output) {
																																
																																	// Check if cancel didn't occur
																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																
																																		// Resolve output
																																		resolve(output);
																																	}
																													
																																	// Otherwise
																																	else {
																																	
																																		// Reject canceled error
																																		reject(Common.CANCELED_ERROR);
																																	}
																																
																																// Catch errors
																																}).catch(function(error) {
																																
																																	// Check if cancel didn't occur
																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																
																																		// Reject error
																																		reject(error);
																																	}
																													
																																	// Otherwise
																																	else {
																																	
																																		// Reject canceled error
																																		reject(Common.CANCELED_ERROR);
																																	}
																																});
																															}
																														}
																														
																														// Otherwise
																														else {
																														
																															// Reject canceled error
																															reject(Common.CANCELED_ERROR);
																														}
																														
																													// Catch errors
																													}).catch(function(error) {
																													
																														// Check if cancel didn't occur
																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																												
																															// Reject error
																															reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																														}
																													
																														// Otherwise
																														else {
																														
																															// Reject canceled error
																															reject(Common.CANCELED_ERROR);
																														}
																													});
																												}
																												
																												// Otherwise
																												else {
																												
																													// Reject canceled error
																													reject(Common.CANCELED_ERROR);
																												}
																											
																											// Catch errors
																											}).catch(function(error) {
																											
																												// Check if cancel didn't occur
																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																											
																													// Check if hardware wallet was disconnected
																													if(error === HardwareWallet.DISCONNECTED_ERROR) {
																													
																														// Check if wallet's hardware wallet is connected
																														if(wallet.isHardwareConnected() === true) {
																													
																															// Wallet's hardware wallet disconnect event
																															$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																														
																																// Return getting output
																																return getOutput().then(function(output) {
																																
																																	// Check if cancel didn't occur
																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																
																																		// Resolve output
																																		resolve(output);
																																	}
																																	
																																	// Otherwise
																																	else {
																																	
																																		// Reject canceled error
																																		reject(Common.CANCELED_ERROR);
																																	}
																																
																																// Catch errors
																																}).catch(function(error) {
																																
																																	// Check if cancel didn't occur
																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																
																																		// Reject error
																																		reject(error);
																																	}
																																	
																																	// Otherwise
																																	else {
																																	
																																		// Reject canceled error
																																		reject(Common.CANCELED_ERROR);
																																	}
																																});
																															});
																														}
																														
																														// Otherwise
																														else {
																														
																															// Return getting output
																															return getOutput().then(function(output) {
																															
																																// Check if cancel didn't occur
																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																															
																																	// Resolve output
																																	resolve(output);
																																}
																																
																																// Otherwise
																																else {
																																
																																	// Reject canceled error
																																	reject(Common.CANCELED_ERROR);
																																}
																															
																															// Catch errors
																															}).catch(function(error) {
																															
																																// Check if cancel didn't occur
																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																															
																																	// Reject error
																																	reject(error);
																																}
																																
																																// Otherwise
																																else {
																																
																																	// Reject canceled error
																																	reject(Common.CANCELED_ERROR);
																																}
																															});
																														}
																													}
																													
																													// Otherwise check if canceled
																													else if(error === Common.CANCELED_ERROR) {
																													
																														// Reject error
																														reject(error);
																													}
																													
																													// Otherwise
																													else {
																												
																														// Reject error
																														reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																													}
																												}
																												
																												// Otherwise
																												else {
																												
																													// Reject canceled error
																													reject(Common.CANCELED_ERROR);
																												}
																											});
																										}
																										
																										// Otherwise
																										else {
																										
																											// Reject canceled error
																											reject(Common.CANCELED_ERROR);
																										}
																									});
																								};
																								
																								// Check if wallet isn't a hardware wallet
																								if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																								
																									// Return building output
																									return buildOutput().then(function(output) {
																									
																										// Check if cancel didn't occur
																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																									
																											// Resolve output
																											resolve(output);
																										}
																										
																										// Otherwise
																										else {
																										
																											// Reject canceled error
																											reject(Common.CANCELED_ERROR);
																										}
																									
																									// Catch errors
																									}).catch(function(error) {
																									
																										// Check if cancel didn't occur
																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																										
																											// Reject error
																											reject(error);
																										}
																										
																										// Otherwise
																										else {
																										
																											// Reject canceled error
																											reject(Common.CANCELED_ERROR);
																										}
																									});
																								}
																								
																								// Otherwise
																								else {
																								
																									// Return waiting for wallet's hardware wallet to connect
																									return self.wallets.waitForHardwareWalletToConnect(wallet.getKeyPath(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Connect the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Connect the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function() {
																									
																										// Check if cancel didn't occur
																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																									
																											// Return building output
																											return buildOutput().then(function(output) {
																											
																												// Check if cancel didn't occur
																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																											
																													// Resolve output
																													resolve(output);
																												}
																										
																												// Otherwise
																												else {
																												
																													// Reject canceled error
																													reject(Common.CANCELED_ERROR);
																												}
																											
																											// Catch errors
																											}).catch(function(error) {
																											
																												// Check if cancel didn't occur
																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																											
																													// Reject error
																													reject(error);
																												}
																										
																												// Otherwise
																												else {
																												
																													// Reject canceled error
																													reject(Common.CANCELED_ERROR);
																												}
																											});
																										}
																										
																										// Otherwise
																										else {
																										
																											// Reject canceled error
																											reject(Common.CANCELED_ERROR);
																										}
																										
																									// Catch errors
																									}).catch(function(error) {
																									
																										// Check if cancel didn't occur
																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																									
																											// Check if canceled
																											if(error === Common.CANCELED_ERROR) {
																											
																												// Reject error
																												reject(error);
																											}
																											
																											// Otherwise
																											else {
																											
																												// Reject error
																												reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																											}
																										}
																										
																										// Otherwise
																										else {
																										
																											// Reject canceled error
																											reject(Common.CANCELED_ERROR);
																										}
																									});
																								}
																							}
																						}
																						
																						// Otherwise
																						else {
																						
																							// Reject canceled error
																							reject(Common.CANCELED_ERROR);
																						}
																					});
																				};
																				
																				// Return getting output
																				return getOutput().then(function(output) {
																				
																					// Check if cancel didn't occur
																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																					
																						// Add output
																						var addOutput = function() {
																						
																							// Return promise
																							return new Promise(function(resolve, reject) {
																					
																								// Check if returned amount isn't zero
																								if(returnedAmount.isZero() === false) {
																							
																									// Try
																									try {
																								
																										// Create a slate output from the output
																										var slateOutput = new SlateOutput(output[Wallet.OUTPUT_FEATURES_INDEX], output[Wallet.OUTPUT_COMMIT_INDEX], output[Wallet.OUTPUT_PROOF_INDEX]);
																									}
																									
																									// Catch errors
																									catch(error) {
																									
																										// Reject error
																										reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																										
																										// Return
																										return;
																									}
																									
																									// Return adding output to slate
																									return Slate.addOutputsAsynchronous(slate, [slateOutput]).then(function(slate) {
																									
																										// Resolve slate
																										resolve(slate);
																									
																									// Catch errors
																									}).catch(function(error) {
																									
																										// Reject error
																										reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																									});
																								}
																								
																								// Otherwise
																								else {
																								
																									// Resolve slate
																									resolve(slate);
																								}
																							});
																						};
																						
																						// Return adding output
																						return addOutput().then(function(slate) {
																						
																							// Check if cancel didn't occur
																							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																						
																								// Create offset
																								var createOffset = function() {
																								
																									// Return promise
																									return new Promise(function(resolve, reject) {
																									
																										// Check if cancel didn't occur
																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																										
																											// Create slate offset
																											slate.createOffset();
																											
																											// Check if returned amount isn't zero
																											if(returnedAmount.isZero() === false) {
																											
																												// Try
																												try {
																												
																													// Get slate's kernel offset
																													var kernelOffset = slate.getOffsetExcess();
																												}
																												
																												// Catch errors
																												catch(error) {
																												
																													// Reject error
																													reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																													
																													// Return
																													return;
																												}
																												
																												// Return getting a received transaction for the wallet with the kernel offset
																												return self.transactions.getWalletsReceivedTransactionWithKernelOffset(wallet.getKeyPath(), kernelOffset).then(function(transaction) {
																												
																													// Check if cancel didn't occur
																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																												
																														// Check if a received transaction for the wallet with the same kernel offset doesn't exist
																														if(transaction === Transactions.NO_TRANSACTION_FOUND) {
																														
																															// Resolve
																															resolve();
																														}
																														
																														// Otherwise
																														else {
																														
																															// Return creating offset
																															return createOffset().then(function() {
																															
																																// Check if cancel didn't occur
																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																
																																	// Resolve
																																	resolve();
																																}
																									
																																// Otherwise
																																else {
																																
																																	// Reject canceled error
																																	reject(Common.CANCELED_ERROR);
																																}
																															
																															// Catch errors
																															}).catch(function(error) {
																															
																																// Check if cancel didn't occur
																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																
																																	// Check if canceled
																																	if(error === Common.CANCELED_ERROR) {
																																	
																																		// Reject error
																																		reject(error);
																																	}
																																	
																																	// Otherwise
																																	else {
																																	
																																		// Reject error
																																		reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																																	}
																																}
																									
																																// Otherwise
																																else {
																																
																																	// Reject canceled error
																																	reject(Common.CANCELED_ERROR);
																																}
																															});
																														}
																													}
																										
																													// Otherwise
																													else {
																													
																														// Reject canceled error
																														reject(Common.CANCELED_ERROR);
																													}
																												
																												// Catch errors
																												}).catch(function(error) {
																												
																													// Check if cancel didn't occur
																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																												
																														// Reject error
																														reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																													}
																										
																													// Otherwise
																													else {
																													
																														// Reject canceled error
																														reject(Common.CANCELED_ERROR);
																													}
																												});
																											}
																											
																											// Otherwise
																											else {
																											
																												// Resolve
																												resolve();
																											}
																										}
																										
																										// Otherwise
																										else {
																										
																											// Reject canceled error
																											reject(Common.CANCELED_ERROR);
																										}
																									});
																								};
																								
																								// Return creating offset
																								return createOffset().then(function() {
																								
																									// Check if cancel didn't occur
																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																								
																										// Initialize secret key
																										var secretKey;
																										
																										// Initialize secret nonce
																										var secretNonce;
																										
																										// Initialize encrypted secret nonce
																										var encryptedSecretNonce;
																										
																										// Add slate participant
																										var addSlateParticipant = function() {
																										
																											// Return promise
																											return new Promise(function(resolve, reject) {
																											
																												// Check if cancel didn't occur
																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																											
																													// Check if wallet isn't a hardware wallet
																													if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																										
																														// Return getting wallet's sum of outputs and inputs
																														return wallet.getSum(
																														
																															// Outputs
																															(returnedAmount.isZero() === false) ? [output] : [],
																															
																															// Inputs
																															inputs
																														
																														).then(function(sum) {
																														
																															// Check if cancel didn't occur
																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																															
																																// Return applying offset to slate
																																return slate.applyOffset(sum).then(function(offset) {
																																
																																	// Check if cancel didn't occur
																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																
																																		// Securely clear the sum
																																		sum.fill(0);
																																	
																																		// Set secret key to the offset
																																		secretKey = offset;
																																		
																																		// Check if creating a secret nonce was successful
																																		secretNonce = Secp256k1Zkp.createSecretNonce();
																																		
																																		if(secretNonce !== Secp256k1Zkp.OPERATION_FAILED) {
																																	
																																			// Return adding participant to slate
																																			return slate.addParticipant(secretKey, secretNonce, message, wallet.getNetworkType() === Consensus.MAINNET_NETWORK_TYPE).then(function() {
																																			
																																				// Check if cancel didn't occur
																																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																			
																																					// Resolve
																																					resolve();
																																				}
																																				
																																				// Otherwise
																																				else {
																																				
																																					// Securely clear the secret nonce and secret key
																																					secretNonce.fill(0);
																																					secretKey.fill(0);
																																					
																																					// Reject canceled error
																																					reject(Common.CANCELED_ERROR);
																																				}
																																			
																																			// Catch errors
																																			}).catch(function(error) {
																																			
																																				// Securely clear the secret nonce and secret key
																																				secretNonce.fill(0);
																																				secretKey.fill(0);
																																			
																																				// Check if cancel didn't occur
																																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																			
																																					// Reject error
																																					reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																																				}
																																				
																																				// Otherwise
																																				else {
																																				
																																					// Reject canceled error
																																					reject(Common.CANCELED_ERROR);
																																				}
																																			});
																																		}
																																		
																																		// Otherwise
																																		else {
																																		
																																			// Securely clear the secret key
																																			secretKey.fill(0);
																																			
																																			// Reject error
																																			reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																																		}
																																	}
																																	
																																	// Otherwise
																																	else {
																																	
																																		// Securely clear the sum
																																		sum.fill(0);
																																		
																																		// Securely clear the offset
																																		offset.fill(0);
																																	
																																		// Reject canceled error
																																		reject(Common.CANCELED_ERROR);
																																	}	
																																
																																// Catch errors
																																}).catch(function(error) {
																																
																																	// Securely clear the sum
																																	sum.fill(0);
																																	
																																	// Check if cancel didn't occur
																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																
																																		// Reject error
																																		reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																																	}
																																	
																																	// Otherwise
																																	else {
																																	
																																		// Reject canceled error
																																		reject(Common.CANCELED_ERROR);
																																	}
																																});
																															}
																															
																															// Otherwise
																															else {
																															
																																// Securely clear the sum
																																sum.fill(0);
																															
																																// Reject canceled error
																																reject(Common.CANCELED_ERROR);
																															}	
																														
																														// Catch errors
																														}).catch(function(error) {
																														
																															// Check if cancel didn't occur
																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																														
																																// Reject error
																																reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																															}
																															
																															// Otherwise
																															else {
																															
																																// Reject canceled error
																																reject(Common.CANCELED_ERROR);
																															}	
																														});
																													}
																													
																													// Otherwise
																													else {
																													
																														// Return waiting for wallet's hardware wallet to connect
																														return self.wallets.waitForHardwareWalletToConnect(wallet.getKeyPath(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Connect the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Connect the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function() {
																														
																															// Check if cancel didn't occur
																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																															
																																// Check if hardware wallet is connected
																																if(wallet.isHardwareConnected() === true) {
																														
																																	// Return starting transaction for the output amount and total amount with the wallet's hardware wallet
																																	return wallet.getHardwareWallet().startTransaction(Wallet.PAYMENT_PROOF_TOR_ADDRESS_KEY_INDEX, (returnedAmount.isZero() === false) ? output[Wallet.OUTPUT_AMOUNT_INDEX] : new BigNumber(0), totalAmount.minus(fee), fee, receiverAddress, (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function() {
																																	
																																		// Check if cancel didn't occur
																																		if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																		
																																			// Set include transaction parts
																																			var includeTransactionParts = new Promise(function(resolve, reject) {
																																			
																																				// Check if cancel didn't occur
																																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																			
																																					// Resolve
																																					resolve();
																																				}
																																							
																																				// Otherwise
																																				else {
																																				
																																					// Reject canceled error
																																					reject(Common.CANCELED_ERROR);
																																				}
																																			});
																																			
																																			// Initialize including transaction parts
																																			var includingTransactionParts = [includeTransactionParts];
																																			
																																			// Check if returned amount isn't zero
																																			if(returnedAmount.isZero() === false) {
																																			
																																				// Include next transaction part after previous part is included
																																				includeTransactionParts = includeTransactionParts.then(function() {
																																			
																																					// Return promise
																																					return new Promise(function(resolve, reject) {
																																					
																																						// Check if cancel didn't occur
																																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																						
																																							// Check if wallet's hardware wallet is connected
																																							if(wallet.isHardwareConnected() === true) {
																																						
																																								// Return including output in the transaction with the wallet's hardware wallet
																																								return wallet.getHardwareWallet().includeOutputInTransaction(output[Wallet.OUTPUT_AMOUNT_INDEX], output[Wallet.OUTPUT_IDENTIFIER_INDEX], output[Wallet.OUTPUT_SWITCH_TYPE_INDEX], (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function() {
																																								
																																									// Check if cancel didn't occur
																																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																										// Resolve
																																										resolve();
																																									}
																																									
																																									// Otherwise
																																									else {
																																									
																																										// Reject canceled error
																																										reject(Common.CANCELED_ERROR);
																																									}
																																								
																																								// Catch errors
																																								}).catch(function(error) {
																																								
																																									// Check if cancel didn't occur
																																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																								
																																										// Reject error
																																										reject(error);
																																									}
																																									
																																									// Otherwise
																																									else {
																																									
																																										// Reject canceled error
																																										reject(Common.CANCELED_ERROR);
																																									}
																																								});
																																							}
																																							
																																							// Otherwise
																																							else {
																																							
																																								// Reject hardware disconnected error
																																								reject(HardwareWallet.DISCONNECTED_ERROR);
																																							}
																																						}
																																								
																																						// Otherwise
																																						else {
																																						
																																							// Reject canceled error
																																							reject(Common.CANCELED_ERROR);
																																						}
																																					});
																																				
																																				// Catch errors
																																				}).catch(function(error) {
																																				
																																					// Return promise
																																					return new Promise(function(resolve, reject) {
																																					
																																						// Check if cancel didn't occur
																																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																						
																																							// Reject error
																																							reject(error);
																																						}
																																								
																																						// Otherwise
																																						else {
																																						
																																							// Reject canceled error
																																							reject(Common.CANCELED_ERROR);
																																						}
																																					});
																																				});
																																				
																																				// Append including trasnaction part to list
																																				includingTransactionParts.push(includeTransactionParts);
																																			}
																																			
																																			// Go through all inputs
																																			for(var i = 0; i < inputs["length"]; ++i) {
																																			
																																				// Get input
																																				let input = inputs[i];
																																				
																																				// Include next transaction part after previous part is included
																																				includeTransactionParts = includeTransactionParts.then(function() {
																																			
																																					// Return promise
																																					return new Promise(function(resolve, reject) {
																																					
																																						// Check if cancel didn't occur
																																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																						
																																							// Check if wallet's hardware wallet is connected
																																							if(wallet.isHardwareConnected() === true) {
																																					
																																								// Return including input in the transaction with the wallet's hardware wallet
																																								return wallet.getHardwareWallet().includeInputInTransaction(input[Wallet.INPUT_AMOUNT_INDEX], input[Wallet.INPUT_IDENTIFIER_INDEX], input[Wallet.INPUT_SWITCH_TYPE_INDEX], (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function() {
																																								
																																									// Check if cancel didn't occur
																																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																										// Resolve
																																										resolve();
																																									}
																																							
																																									// Otherwise
																																									else {
																																									
																																										// Reject canceled error
																																										reject(Common.CANCELED_ERROR);
																																									}
																																								
																																								// Catch errors
																																								}).catch(function(error) {
																																								
																																									// Check if cancel didn't occur
																																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																								
																																										// Reject error
																																										reject(error);
																																									}
																																							
																																									// Otherwise
																																									else {
																																									
																																										// Reject canceled error
																																										reject(Common.CANCELED_ERROR);
																																									}
																																								});
																																							}
																																							
																																							// Otherwise
																																							else {
																																							
																																								// Reject hardware disconnected error
																																								reject(HardwareWallet.DISCONNECTED_ERROR);
																																							}
																																						}
																																						
																																						// Otherwise
																																						else {
																																						
																																							// Reject canceled error
																																							reject(Common.CANCELED_ERROR);
																																						}
																																					});
																																				
																																				// Catch errors
																																				}).catch(function(error) {
																																				
																																					// Return promise
																																					return new Promise(function(resolve, reject) {
																																						
																																						// Check if cancel didn't occur
																																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																						
																																							// Reject error
																																							reject(error);
																																						}
																																								
																																						// Otherwise
																																						else {
																																						
																																							// Reject canceled error
																																							reject(Common.CANCELED_ERROR);
																																						}
																																					});
																																				});
																																				
																																				// Append including trasnaction part to list
																																				includingTransactionParts.push(includeTransactionParts);
																																			}
																																			
																																			// Return including all transaction parts in the transaction
																																			return Promise.all(includingTransactionParts).then(function() {
																																			
																																				// Check if cancel didn't occur
																																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																				
																																					// Check if wallet's hardware wallet is connected
																																					if(wallet.isHardwareConnected() === true) {
																																					
																																						// Return applying offset to slate
																																						return slate.applyOffset(wallet.getHardwareWallet(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function() {
																																						
																																							// Check if cancel didn't occur
																																							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																							
																																								// Check if wallet's hardware wallet is connected
																																								if(wallet.isHardwareConnected() === true) {
																																								
																																									// Save slate's receiver signature
																																									var oldReceiverSignature = slate.getReceiverSignature();
																																				
																																									// Return adding participant to slate
																																									return slate.addParticipant(wallet.getHardwareWallet(), Slate.NO_ENCRYPTED_SECRET_NONCE, message, wallet.getNetworkType() === Consensus.MAINNET_NETWORK_TYPE, (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function() {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Check if wallet's hardware wallet is connected
																																											if(wallet.isHardwareConnected() === true) {
																																											
																																												// Return getting the transaction encrypted secret nonce with the wallet's hardware wallet
																																												return wallet.getHardwareWallet().getTransactionEncryptedSecretNonce((wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function(transactionEncryptedSecretNonce) {
																																												
																																													// Check if cancel didn't occur
																																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																												
																																														// Check if wallet's hardware wallet is connected
																																														if(wallet.isHardwareConnected() === true) {
																																												
																																															// Set encrypted secret nonce
																																															encryptedSecretNonce = transactionEncryptedSecretNonce;
																																														
																																															// Return completing transaction with the wallet's hardware wallet
																																															return wallet.getHardwareWallet().completeTransaction().then(function() {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Resolve
																																																	resolve();
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject canceled error
																																																	reject(Common.CANCELED_ERROR);
																																																}
																																																
																																															// Catch errors
																																															}).catch(function(error) {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Check if canceled
																																																	if(error === Common.CANCELED_ERROR) {
																																																	
																																																		// Reject error
																																																		reject(error);
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																
																																																		// Reject error
																																																		reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																																																	}
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject canceled error
																																																	reject(Common.CANCELED_ERROR);
																																																}
																																															});
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Remove participant from slate
																																															slate.getParticipants().pop();
																																															
																																															// Restore slate's old receiver signature
																																															slate.setReceiverSignature(oldReceiverSignature);
																																															
																																															// Return adding a slate participant
																																															return addSlateParticipant().then(function() {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Resolve
																																																	resolve();
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject canceled error
																																																	reject(Common.CANCELED_ERROR);
																																																}
																																															
																																															// Catch errors
																																															}).catch(function(error) {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Reject error
																																																	reject(error);
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject canceled error
																																																	reject(Common.CANCELED_ERROR);
																																																}
																																															});
																																														}
																																													}
																																													
																																													// Otherwise
																																													else {
																																													
																																														// Check if wallet's hardware wallet is connected
																																														if(wallet.isHardwareConnected() === true) {
																																													
																																															// Return canceling transaction with the wallet's hardware wallet and catch errors
																																															return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																															
																																															// Finally
																																															}).finally(function() {
																																														
																																																// Reject canceled error
																																																reject(Common.CANCELED_ERROR);
																																															});
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject canceled error
																																															reject(Common.CANCELED_ERROR);
																																														}
																																													}
																																												
																																												// Catch errors
																																												}).catch(function(error) {
																																												
																																													// Remove participant from slate
																																													slate.getParticipants().pop();
																																													
																																													// Restore slate's old receiver signature
																																													slate.setReceiverSignature(oldReceiverSignature);
																																												
																																													// Check if wallet's hardware wallet is connected
																																													if(wallet.isHardwareConnected() === true) {
																																												
																																														// Return canceling transaction with the wallet's hardware wallet and catch errors
																																														return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																														
																																														// Finally
																																														}).finally(function() {
																																													
																																															// Check if cancel didn't occur
																																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																														
																																																// Check if hardware wallet was disconnected
																																																if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																																
																																																	// Check if wallet's hardware wallet is connected
																																																	if(wallet.isHardwareConnected() === true) {
																																																
																																																		// Wallet's hardware wallet disconnect event
																																																		$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																																	
																																																			// Return adding a slate participant
																																																			return addSlateParticipant().then(function() {
																																																			
																																																				// Check if cancel didn't occur
																																																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																			
																																																					// Resolve
																																																					resolve();
																																																				}
																																																				
																																																				// Otherwise
																																																				else {
																																																				
																																																					// Reject canceled error
																																																					reject(Common.CANCELED_ERROR);
																																																				}
																																																			
																																																			// Catch errors
																																																			}).catch(function(error) {
																																																			
																																																				// Check if cancel didn't occur
																																																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																			
																																																					// Reject error
																																																					reject(error);
																																																				}
																																																				
																																																				// Otherwise
																																																				else {
																																																				
																																																					// Reject canceled error
																																																					reject(Common.CANCELED_ERROR);
																																																				}
																																																			});
																																																		});
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Return adding a slate participant
																																																		return addSlateParticipant().then(function() {
																																																		
																																																			// Check if cancel didn't occur
																																																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																		
																																																				// Resolve
																																																				resolve();
																																																			}
																																																			
																																																			// Otherwise
																																																			else {
																																																			
																																																				// Reject canceled error
																																																				reject(Common.CANCELED_ERROR);
																																																			}
																																																		
																																																		// Catch errors
																																																		}).catch(function(error) {
																																																		
																																																			// Check if cancel didn't occur
																																																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																		
																																																				// Reject error
																																																				reject(error);
																																																			}
																																																			
																																																			// Otherwise
																																																			else {
																																																			
																																																				// Reject canceled error
																																																				reject(Common.CANCELED_ERROR);
																																																			}
																																																		});
																																																	}
																																																}
																																																
																																																// Otherwise check if canceled
																																																else if(error === Common.CANCELED_ERROR) {
																																																
																																																	// Reject error
																																																	reject(error);
																																																}
																																																
																																																// Otherwise
																																																else {
																																															
																																																	// Reject error
																																																	reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																																																}
																																															}
																																															
																																															// Otherwise
																																															else {
																																															
																																																// Reject canceled error
																																																reject(Common.CANCELED_ERROR);
																																															}
																																														});
																																													}
																																													
																																													// Otherwise
																																													else {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Check if hardware wallet was disconnected
																																															if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																																
																																																// Return adding a slate participant
																																																return addSlateParticipant().then(function() {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																
																																																		// Resolve
																																																		resolve();
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject canceled error
																																																		reject(Common.CANCELED_ERROR);
																																																	}
																																																
																																																// Catch errors
																																																}).catch(function(error) {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																
																																																		// Reject error
																																																		reject(error);
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject canceled error
																																																		reject(Common.CANCELED_ERROR);
																																																	}
																																																});
																																															}
																																															
																																															// Otherwise check if canceled
																																															else if(error === Common.CANCELED_ERROR) {
																																															
																																																// Reject error
																																																reject(error);
																																															}
																																															
																																															// Otherwise
																																															else {
																																														
																																																// Reject error
																																																reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																																															}
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject canceled error
																																															reject(Common.CANCELED_ERROR);
																																														}
																																													}
																																												});
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Remove participant from slate
																																												slate.getParticipants().pop();
																																												
																																												// Restore slate's old receiver signature
																																												slate.setReceiverSignature(oldReceiverSignature);
																																												
																																												// Return adding a slate participant
																																												return addSlateParticipant().then(function() {
																																												
																																													// Check if cancel didn't occur
																																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																												
																																														// Resolve
																																														resolve();
																																													}
																																													
																																													// Otherwise
																																													else {
																																													
																																														// Reject canceled error
																																														reject(Common.CANCELED_ERROR);
																																													}
																																												
																																												// Catch errors
																																												}).catch(function(error) {
																																												
																																													// Check if cancel didn't occur
																																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																												
																																														// Reject error
																																														reject(error);
																																													}
																																													
																																													// Otherwise
																																													else {
																																													
																																														// Reject canceled error
																																														reject(Common.CANCELED_ERROR);
																																													}
																																												});
																																											}
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Check if wallet's hardware wallet is connected
																																											if(wallet.isHardwareConnected() === true) {
																																										
																																												// Return canceling transaction with the wallet's hardware wallet and catch errors
																																												return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																												
																																												// Finally
																																												}).finally(function() {
																																											
																																													// Reject canceled error
																																													reject(Common.CANCELED_ERROR);
																																												});
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Reject canceled error
																																												reject(Common.CANCELED_ERROR);
																																											}
																																										}
																																									
																																									// Catch errors
																																									}).catch(function(error) {
																																									
																																										// Check if wallet's hardware wallet is connected
																																										if(wallet.isHardwareConnected() === true) {
																																									
																																											// Return canceling transaction with the wallet's hardware wallet and catch errors
																																											return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																											
																																											// Finally
																																											}).finally(function() {
																																										
																																												// Check if cancel didn't occur
																																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																													// Check if hardware wallet was disconnected
																																													if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																													
																																														// Check if wallet's hardware wallet is connected
																																														if(wallet.isHardwareConnected() === true) {
																																													
																																															// Wallet's hardware wallet disconnect event
																																															$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																														
																																																// Return adding a slate participant
																																																return addSlateParticipant().then(function() {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																
																																																		// Resolve
																																																		resolve();
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject canceled error
																																																		reject(Common.CANCELED_ERROR);
																																																	}
																																																
																																																// Catch errors
																																																}).catch(function(error) {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																
																																																		// Reject error
																																																		reject(error);
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject canceled error
																																																		reject(Common.CANCELED_ERROR);
																																																	}
																																																});
																																															});
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Return adding a slate participant
																																															return addSlateParticipant().then(function() {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Resolve
																																																	resolve();
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject canceled error
																																																	reject(Common.CANCELED_ERROR);
																																																}
																																															
																																															// Catch errors
																																															}).catch(function(error) {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Reject error
																																																	reject(error);
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject canceled error
																																																	reject(Common.CANCELED_ERROR);
																																																}
																																															});
																																														}
																																													}
																																													
																																													// Otherwise check if canceled
																																													else if(error === Common.CANCELED_ERROR) {
																																													
																																														// Reject error
																																														reject(error);
																																													}
																																													
																																													// Otherwise
																																													else {
																																												
																																														// Reject error
																																														reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																																													}
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Reject canceled error
																																													reject(Common.CANCELED_ERROR);
																																												}
																																											});
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Check if cancel didn't occur
																																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																										
																																												// Check if hardware wallet was disconnected
																																												if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																													
																																													// Return adding a slate participant
																																													return addSlateParticipant().then(function() {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Resolve
																																															resolve();
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject canceled error
																																															reject(Common.CANCELED_ERROR);
																																														}
																																													
																																													// Catch errors
																																													}).catch(function(error) {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Reject error
																																															reject(error);
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject canceled error
																																															reject(Common.CANCELED_ERROR);
																																														}
																																													});
																																												}
																																												
																																												// Otherwise check if canceled
																																												else if(error === Common.CANCELED_ERROR) {
																																												
																																													// Reject error
																																													reject(error);
																																												}
																																												
																																												// Otherwise
																																												else {
																																											
																																													// Reject error
																																													reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																																												}
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Reject canceled error
																																												reject(Common.CANCELED_ERROR);
																																											}
																																										}
																																									});
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Return adding a slate participant
																																									return addSlateParticipant().then(function() {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Resolve
																																											resolve();
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject canceled error
																																											reject(Common.CANCELED_ERROR);
																																										}
																																									
																																									// Catch errors
																																									}).catch(function(error) {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Reject error
																																											reject(error);
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject canceled error
																																											reject(Common.CANCELED_ERROR);
																																										}
																																									});
																																								}
																																							}
																																							
																																							// Otherwise
																																							else {
																																							
																																								// Check if wallet's hardware wallet is connected
																																								if(wallet.isHardwareConnected() === true) {
																																							
																																									// Return canceling transaction with the wallet's hardware wallet and catch errors
																																									return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																									
																																									// Finally
																																									}).finally(function() {
																																								
																																										// Reject canceled error
																																										reject(Common.CANCELED_ERROR);
																																									});
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Reject canceled error
																																									reject(Common.CANCELED_ERROR);
																																								}
																																							}
																																						
																																						// Catch errors
																																						}).catch(function(error) {
																																						
																																							// Check if wallet's hardware wallet is connected
																																							if(wallet.isHardwareConnected() === true) {
																																						
																																								// Return canceling transaction with the wallet's hardware wallet and catch errors
																																								return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																								
																																								// Finally
																																								}).finally(function() {
																																							
																																									// Check if cancel didn't occur
																																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																								
																																										// Check if hardware wallet was disconnected
																																										if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																										
																																											// Check if wallet's hardware wallet is connected
																																											if(wallet.isHardwareConnected() === true) {
																																										
																																												// Wallet's hardware wallet disconnect event
																																												$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																											
																																													// Return adding a slate participant
																																													return addSlateParticipant().then(function() {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Resolve
																																															resolve();
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject canceled error
																																															reject(Common.CANCELED_ERROR);
																																														}
																																													
																																													// Catch errors
																																													}).catch(function(error) {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Reject error
																																															reject(error);
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject canceled error
																																															reject(Common.CANCELED_ERROR);
																																														}
																																													});
																																												});
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Return adding a slate participant
																																												return addSlateParticipant().then(function() {
																																												
																																													// Check if cancel didn't occur
																																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																												
																																														// Resolve
																																														resolve();
																																													}
																																													
																																													// Otherwise
																																													else {
																																													
																																														// Reject canceled error
																																														reject(Common.CANCELED_ERROR);
																																													}
																																												
																																												// Catch errors
																																												}).catch(function(error) {
																																												
																																													// Check if cancel didn't occur
																																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																												
																																														// Reject error
																																														reject(error);
																																													}
																																													
																																													// Otherwise
																																													else {
																																													
																																														// Reject canceled error
																																														reject(Common.CANCELED_ERROR);
																																													}
																																												});
																																											}
																																										}
																																										
																																										// Otherwise check if canceled
																																										else if(error === Common.CANCELED_ERROR) {
																																										
																																											// Reject error
																																											reject(error);
																																										}
																																										
																																										// Otherwise
																																										else {
																																									
																																											// Reject error
																																											reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																																										}
																																									}
																																									
																																									// Otherwise
																																									else {
																																									
																																										// Reject canceled error
																																										reject(Common.CANCELED_ERROR);
																																									}
																																								});
																																							}
																																							
																																							// Otherwise
																																							else {
																																							
																																								// Check if cancel didn't occur
																																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																							
																																									// Check if hardware wallet was disconnected
																																									if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																										
																																										// Return adding a slate participant
																																										return addSlateParticipant().then(function() {
																																										
																																											// Check if cancel didn't occur
																																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																										
																																												// Resolve
																																												resolve();
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Reject canceled error
																																												reject(Common.CANCELED_ERROR);
																																											}
																																										
																																										// Catch errors
																																										}).catch(function(error) {
																																										
																																											// Check if cancel didn't occur
																																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																										
																																												// Reject error
																																												reject(error);
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Reject canceled error
																																												reject(Common.CANCELED_ERROR);
																																											}
																																										});
																																									}
																																									
																																									// Otherwise check if canceled
																																									else if(error === Common.CANCELED_ERROR) {
																																									
																																										// Reject error
																																										reject(error);
																																									}
																																									
																																									// Otherwise
																																									else {
																																								
																																										// Reject error
																																										reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																																									}
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Reject canceled error
																																									reject(Common.CANCELED_ERROR);
																																								}
																																							}
																																						});
																																					}
																																					
																																					// Otherwise
																																					else {
																																					
																																						// Return adding a slate participant
																																						return addSlateParticipant().then(function() {
																																						
																																							// Check if cancel didn't occur
																																							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																						
																																								// Resolve
																																								resolve();
																																							}
																																							
																																							// Otherwise
																																							else {
																																							
																																								// Reject canceled error
																																								reject(Common.CANCELED_ERROR);
																																							}
																																						
																																						// Catch errors
																																						}).catch(function(error) {
																																						
																																							// Check if cancel didn't occur
																																							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																						
																																								// Reject error
																																								reject(error);
																																							}
																																							
																																							// Otherwise
																																							else {
																																							
																																								// Reject canceled error
																																								reject(Common.CANCELED_ERROR);
																																							}
																																						});
																																					}
																																				}
																																				
																																				// Otherwise
																																				else {
																																				
																																					// Check if wallet's hardware wallet is connected
																																					if(wallet.isHardwareConnected() === true) {
																																				
																																						// Return canceling transaction with the wallet's hardware wallet and catch errors
																																						return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																						
																																						// Finally
																																						}).finally(function() {
																																					
																																							// Reject canceled error
																																							reject(Common.CANCELED_ERROR);
																																						});
																																					}
																																					
																																					// Otherwise
																																					else {
																																					
																																						// Reject canceled error
																																						reject(Common.CANCELED_ERROR);
																																					}
																																				}
																																				
																																			// Catch errors
																																			}).catch(function(error) {
																																			
																																				// Check if wallet's hardware wallet is connected
																																				if(wallet.isHardwareConnected() === true) {
																																			
																																					// Return canceling transaction with the wallet's hardware wallet and catch errors
																																					return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																					
																																					// Finally
																																					}).finally(function() {
																																				
																																						// Check if cancel didn't occur
																																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																					
																																							// Check if hardware wallet was disconnected
																																							if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																							
																																								// Check if wallet's hardware wallet is connected
																																								if(wallet.isHardwareConnected() === true) {
																																							
																																									// Wallet's hardware wallet disconnect event
																																									$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																								
																																										// Return adding a slate participant
																																										return addSlateParticipant().then(function() {
																																										
																																											// Check if cancel didn't occur
																																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																										
																																												// Resolve
																																												resolve();
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Reject canceled error
																																												reject(Common.CANCELED_ERROR);
																																											}
																																										
																																										// Catch errors
																																										}).catch(function(error) {
																																										
																																											// Check if cancel didn't occur
																																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																										
																																												// Reject error
																																												reject(error);
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Reject canceled error
																																												reject(Common.CANCELED_ERROR);
																																											}
																																										});
																																									});
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Return adding a slate participant
																																									return addSlateParticipant().then(function() {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Resolve
																																											resolve();
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject canceled error
																																											reject(Common.CANCELED_ERROR);
																																										}
																																									
																																									// Catch errors
																																									}).catch(function(error) {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Reject error
																																											reject(error);
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject canceled error
																																											reject(Common.CANCELED_ERROR);
																																										}
																																									});
																																								}
																																							}
																																							
																																							// Otherwise check if canceled
																																							else if(error === Common.CANCELED_ERROR) {
																																							
																																								// Reject error
																																								reject(error);
																																							}
																																							
																																							// Otherwise
																																							else {
																																						
																																								// Reject error
																																								reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																																							}
																																						}
																																						
																																						// Otherwise
																																						else {
																																						
																																							// Reject canceled error
																																							reject(Common.CANCELED_ERROR);
																																						}
																																					});
																																				}
																																				
																																				// Otherwise
																																				else {
																																				
																																					// Check if cancel didn't occur
																																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																				
																																						// Check if hardware wallet was disconnected
																																						if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																							
																																							// Return adding a slate participant
																																							return addSlateParticipant().then(function() {
																																							
																																								// Check if cancel didn't occur
																																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																							
																																									// Resolve
																																									resolve();
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Reject canceled error
																																									reject(Common.CANCELED_ERROR);
																																								}
																																							
																																							// Catch errors
																																							}).catch(function(error) {
																																							
																																								// Check if cancel didn't occur
																																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																							
																																									// Reject error
																																									reject(error);
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Reject canceled error
																																									reject(Common.CANCELED_ERROR);
																																								}
																																							});
																																						}
																																						
																																						// Otherwise check if canceled
																																						else if(error === Common.CANCELED_ERROR) {
																																						
																																							// Reject error
																																							reject(error);
																																						}
																																						
																																						// Otherwise
																																						else {
																																					
																																							// Reject error
																																							reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																																						}
																																					}
																																					
																																					// Otherwise
																																					else {
																																					
																																						// Reject canceled error
																																						reject(Common.CANCELED_ERROR);
																																					}
																																				}
																																			});
																																		}
																																		
																																		// Otherwise
																																		else {
																																		
																																			// Check if wallet's hardware wallet is connected
																																			if(wallet.isHardwareConnected() === true) {
																																		
																																				// Return canceling transaction with the wallet's hardware wallet and catch errors
																																				return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																				
																																				// Finally
																																				}).finally(function() {
																																			
																																					// Reject canceled error
																																					reject(Common.CANCELED_ERROR);
																																				});
																																			}
																																			
																																			// Otherwise
																																			else {
																																			
																																				// Reject canceled error
																																				reject(Common.CANCELED_ERROR);
																																			}
																																		}
																																			
																																	// Catch errors
																																	}).catch(function(error) {
																																	
																																		// Check if cancel didn't occur
																																		if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																	
																																			// Check if hardware wallet was disconnected
																																			if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																			
																																				// Check if wallet's hardware wallet is connected
																																				if(wallet.isHardwareConnected() === true) {
																																			
																																					// Wallet's hardware wallet disconnect event
																																					$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																				
																																						// Return adding a slate participant
																																						return addSlateParticipant().then(function() {
																																						
																																							// Check if cancel didn't occur
																																							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																						
																																								// Resolve
																																								resolve();
																																							}
																																							
																																							// Otherwise
																																							else {
																																							
																																								// Reject canceled error
																																								reject(Common.CANCELED_ERROR);
																																							}
																																						
																																						// Catch errors
																																						}).catch(function(error) {
																																						
																																							// Check if cancel didn't occur
																																							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																						
																																								// Reject error
																																								reject(error);
																																							}
																																							
																																							// Otherwise
																																							else {
																																							
																																								// Reject canceled error
																																								reject(Common.CANCELED_ERROR);
																																							}
																																						});
																																					});
																																				}
																																				
																																				// Otherwise
																																				else {
																																				
																																					// Return adding a slate participant
																																					return addSlateParticipant().then(function() {
																																					
																																						// Check if cancel didn't occur
																																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																					
																																							// Resolve
																																							resolve();
																																						}
																																						
																																						// Otherwise
																																						else {
																																						
																																							// Reject canceled error
																																							reject(Common.CANCELED_ERROR);
																																						}
																																					
																																					// Catch errors
																																					}).catch(function(error) {
																																					
																																						// Check if cancel didn't occur
																																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																					
																																							// Reject error
																																							reject(error);
																																						}
																																						
																																						// Otherwise
																																						else {
																																						
																																							// Reject canceled error
																																							reject(Common.CANCELED_ERROR);
																																						}
																																					});
																																				}
																																			}
																																			
																																			// Otherwise check if canceled
																																			else if(error === Common.CANCELED_ERROR) {
																																			
																																				// Reject error
																																				reject(error);
																																			}
																																			
																																			// Otherwise
																																			else {
																																		
																																				// Reject error
																																				reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																																			}
																																		}
																																		
																																		// Otherwise
																																		else {
																																		
																																			// Reject canceled error
																																			reject(Common.CANCELED_ERROR);
																																		}
																																	});
																																}
																												
																																// Otherwise
																																else {
																																
																																	// Return adding a slate participant
																																	return addSlateParticipant().then(function() {
																																	
																																		// Check if cancel didn't occur
																																		if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																	
																																			// Resolve
																																			resolve();
																																		}
																																		
																																		// Otherwise
																																		else {
																																		
																																			// Reject canceled error
																																			reject(Common.CANCELED_ERROR);
																																		}
																																	
																																	// Catch errors
																																	}).catch(function(error) {
																																	
																																		// Check if cancel didn't occur
																																		if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																	
																																			// Reject error
																																			reject(error);
																																		}
																																		
																																		// Otherwise
																																		else {
																																		
																																			// Reject canceled error
																																			reject(Common.CANCELED_ERROR);
																																		}
																																	});
																																}
																															}
																															
																															// Otherwise
																															else {
																															
																																// Reject canceled error
																																reject(Common.CANCELED_ERROR);
																															}
																														
																														// Catch errors
																														}).catch(function(error) {
																														
																															// Check if cancel didn't occur
																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																														
																																// Check if canceled
																																if(error === Common.CANCELED_ERROR) {
																																
																																	// Reject error
																																	reject(error);
																																}
																																
																																// Otherwise
																																else {
																																
																																	// Reject error
																																	reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																																}
																															}
																															
																															// Otherwise
																															else {
																															
																																// Reject canceled error
																																reject(Common.CANCELED_ERROR);
																															}
																														});
																													}
																												}
																												
																												// Otherwise
																												else {
																												
																													// Reject canceled error
																													reject(Common.CANCELED_ERROR);
																												}	
																											});
																										};
																										
																										// Return adding a slate participant
																										return addSlateParticipant().then(function() {
																										
																											// Check if cancel didn't occur
																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																											
																												// Return getting slate response
																												return self.getSlateResponse(receiverUrl, wallet, slate, wallet.getNetworkType() === Consensus.MAINNET_NETWORK_TYPE, cancelOccurred).then(function(slateResponse) {
																												
																													// Get timestamp
																													var timestamp = Date.now();
																												
																													// Check if cancel didn't occur
																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																													
																														// Check if slate is compact
																														if(slate.isCompact() === true) {
																														
																															// Check if combinding the slate response's offset with the slate's offset failed
																															if(slateResponse.combineOffsets(slate) === false) {
																															
																																// Reject error
																																reject(Message.createText(Language.getDefaultTranslation('Finalizing the slate failed.')));
																																
																																// Return
																																return;
																															}
																														}
																												
																														// Finalize slate
																														var finalizeSlate = function() {
																														
																															// Return promise
																															return new Promise(function(resolve, reject) {
																															
																																// Check if cancel didn't occur
																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																	
																																	// Check if wallet isn't a hardware wallet
																																	if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																																	
																																		// Update message
																																		var updateMessage = function() {
																																		
																																			// Return promise
																																			return new Promise(function(resolve, reject) {
																																			
																																				// Check if cancel didn't occur
																																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																				
																																					// Check if can be canceled
																																					if(cancelOccurred !== Common.NO_CANCEL_OCCURRED) {
																																				
																																						// Disable message
																																						self.message.disable();
																																					
																																						// Return replace message
																																						return self.message.replace(Api.FINALIZE_TRANSACTION_MESSAGE, slateResponse.getReceiverAddress()).then(function(replaceResult) {
																																						
																																							// Check if cancel didn't occur
																																							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																							
																																								// Check if a replacement message wasn't not displayed
																																								if(replaceResult !== Message.REPLACE_NOT_DISPLAYED_RESULT) {
																																						
																																									// Resolve
																																									resolve();
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Reject canceled error
																																									reject(Common.CANCELED_ERROR);
																																								}
																																							}
																																			
																																							// Otherwise
																																							else {
																																							
																																								// Reject canceled error
																																								reject(Common.CANCELED_ERROR);
																																							}	
																																						});
																																					}
																																					
																																					// Otherwise
																																					else {
																																					
																																						// Resolve
																																						resolve();
																																					}
																																				}
																																				
																																				// Otherwise
																																				else {
																																				
																																					// Reject canceled error
																																					reject(Common.CANCELED_ERROR);
																																				}	
																																			});
																																		};
																																		
																																		// Return updating message
																																		return updateMessage().then(function() {
																																		
																																			// Check if cancel didn't occur
																																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																			
																																				// Check if can be canceled
																																				if(cancelOccurred !== Common.NO_CANCEL_OCCURRED) {
																																			
																																					// Message first button click API event
																																					$(self.message).one(Message.FIRST_BUTTON_CLICK_EVENT + ".api", function() {
																																					
																																						// Turn off message second button click API event
																																						$(self.message).off(Message.SECOND_BUTTON_CLICK_EVENT + ".api");
																																						
																																						// Turn off message hide API event
																																						$(self.message).off(Message.HIDE_EVENT + ".api");
																																						
																																						// Reject canceled error
																																						reject(Common.CANCELED_ERROR);
																																					
																																					// Message second button click API event
																																					}).one(Message.SECOND_BUTTON_CLICK_EVENT + ".api", function() {
																																					
																																						// Turn off message first button click API event
																																						$(self.message).off(Message.FIRST_BUTTON_CLICK_EVENT + ".api");
																																						
																																						// Turn off message hide API event
																																						$(self.message).off(Message.HIDE_EVENT + ".api");
																																						
																																						// Finalizing the slate response
																																						slateResponse.finalize(secretKey, secretNonce, baseFee, wallet.getNetworkType() === Consensus.MAINNET_NETWORK_TYPE, true).then(function() {
																																						
																																							// Check if cancel didn't occur
																																							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																							
																																								// Resolve
																																								resolve();
																																							}
																																							
																																							// Otherwise
																																							else {
																																							
																																								// Reject canceled error
																																								reject(Common.CANCELED_ERROR);
																																							}
																																						
																																						// Catch errors
																																						}).catch(function(error) {
																																						
																																							// Check if cancel didn't occur
																																							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																					
																																								// Reject error
																																								reject(Message.createText(Language.getDefaultTranslation('Finalizing the slate failed.')));
																																							}
																																							
																																							// Otherwise
																																							else {
																																							
																																								// Reject canceled error
																																								reject(Common.CANCELED_ERROR);
																																							}
																																						});
																																					
																																					// Message hide API event
																																					}).one(Message.HIDE_EVENT + ".api", function() {
																																					
																																						// Turn off message first button click API event
																																						$(self.message).off(Message.FIRST_BUTTON_CLICK_EVENT + ".api");
																																						
																																						// Turn off message second button click API event
																																						$(self.message).off(Message.SECOND_BUTTON_CLICK_EVENT + ".api");
																																						
																																						// Reject canceled error
																																						reject(Common.CANCELED_ERROR);
																																					});
																																				}
																																				
																																				// Otherwise
																																				else {
																																				
																																					// Return finalizing the slate response
																																					return slateResponse.finalize(secretKey, secretNonce, baseFee, wallet.getNetworkType() === Consensus.MAINNET_NETWORK_TYPE, true).then(function() {
																																					
																																						// Check if cancel didn't occur
																																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																						
																																							// Resolve
																																							resolve();
																																						}
																																						
																																						// Otherwise
																																						else {
																																						
																																							// Reject canceled error
																																							reject(Common.CANCELED_ERROR);
																																						}
																																					
																																					// Catch errors
																																					}).catch(function(error) {
																																					
																																						// Check if cancel didn't occur
																																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																				
																																							// Reject error
																																							reject(Message.createText(Language.getDefaultTranslation('Finalizing the slate failed.')));
																																						}
																																						
																																						// Otherwise
																																						else {
																																						
																																							// Reject canceled error
																																							reject(Common.CANCELED_ERROR);
																																						}
																																					});
																																				}
																																			}
																																			
																																			// Otherwise
																																			else {
																																			
																																				// Reject canceled error
																																				reject(Common.CANCELED_ERROR);
																																			}
																																		
																																		// Catch errors
																																		}).catch(function(error) {
																																		
																																			// Check if cancel didn't occur
																																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																		
																																				// Reject error
																																				reject(error);
																																			}
																																				
																																			// Otherwise
																																			else {
																																			
																																				// Reject canceled error
																																				reject(Common.CANCELED_ERROR);
																																			}
																																		});
																																	}
																																	
																																	// Otherwise
																																	else {
																																	
																																		// Return waiting for wallet's hardware wallet to connect
																																		return self.wallets.waitForHardwareWalletToConnect(wallet.getKeyPath(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Connect the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Connect the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function() {
																																		
																																			// Check if cancel didn't occur
																																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																			
																																				// Check if hardware wallet is connected
																																				if(wallet.isHardwareConnected() === true) {
																																		
																																					// Return starting transaction for the output amount and total amount with the wallet's hardware wallet
																																					return wallet.getHardwareWallet().startTransaction(Wallet.PAYMENT_PROOF_TOR_ADDRESS_KEY_INDEX, (returnedAmount.isZero() === false) ? output[Wallet.OUTPUT_AMOUNT_INDEX] : new BigNumber(0), totalAmount.minus(fee), fee, receiverAddress, (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function() {
																																					
																																						// Check if cancel didn't occur
																																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																						
																																							// Set include transaction parts
																																							var includeTransactionParts = new Promise(function(resolve, reject) {
																																							
																																								// Check if cancel didn't occur
																																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																							
																																									// Resolve
																																									resolve();
																																								}
																																											
																																								// Otherwise
																																								else {
																																								
																																									// Reject canceled error
																																									reject(Common.CANCELED_ERROR);
																																								}
																																							});
																																							
																																							// Initialize including transaction parts
																																							var includingTransactionParts = [includeTransactionParts];
																																							
																																							// Check if returned amount isn't zero
																																							if(returnedAmount.isZero() === false) {
																																							
																																								// Include next transaction part after previous part is included
																																								includeTransactionParts = includeTransactionParts.then(function() {
																																							
																																									// Return promise
																																									return new Promise(function(resolve, reject) {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																										
																																											// Check if wallet's hardware wallet is connected
																																											if(wallet.isHardwareConnected() === true) {
																																										
																																												// Return including output in the transaction with the wallet's hardware wallet
																																												return wallet.getHardwareWallet().includeOutputInTransaction(output[Wallet.OUTPUT_AMOUNT_INDEX], output[Wallet.OUTPUT_IDENTIFIER_INDEX], output[Wallet.OUTPUT_SWITCH_TYPE_INDEX], (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function() {
																																												
																																													// Check if cancel didn't occur
																																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																														// Resolve
																																														resolve();
																																													}
																																													
																																													// Otherwise
																																													else {
																																													
																																														// Reject canceled error
																																														reject(Common.CANCELED_ERROR);
																																													}
																																												
																																												// Catch errors
																																												}).catch(function(error) {
																																												
																																													// Check if cancel didn't occur
																																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																												
																																														// Reject error
																																														reject(error);
																																													}
																																													
																																													// Otherwise
																																													else {
																																													
																																														// Reject canceled error
																																														reject(Common.CANCELED_ERROR);
																																													}
																																												});
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Reject hardware disconnected error
																																												reject(HardwareWallet.DISCONNECTED_ERROR);
																																											}
																																										}
																																												
																																										// Otherwise
																																										else {
																																										
																																											// Reject canceled error
																																											reject(Common.CANCELED_ERROR);
																																										}
																																									});
																																								
																																								// Catch errors
																																								}).catch(function(error) {
																																								
																																									// Return promise
																																									return new Promise(function(resolve, reject) {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																										
																																											// Reject error
																																											reject(error);
																																										}
																																												
																																										// Otherwise
																																										else {
																																										
																																											// Reject canceled error
																																											reject(Common.CANCELED_ERROR);
																																										}
																																									});
																																								});
																																								
																																								// Append including trasnaction part to list
																																								includingTransactionParts.push(includeTransactionParts);
																																							}
																																							
																																							// Go through all inputs
																																							for(var i = 0; i < inputs["length"]; ++i) {
																																							
																																								// Get input
																																								let input = inputs[i];
																																								
																																								// Include next transaction part after previous part is included
																																								includeTransactionParts = includeTransactionParts.then(function() {
																																							
																																									// Return promise
																																									return new Promise(function(resolve, reject) {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																										
																																											// Check if wallet's hardware wallet is connected
																																											if(wallet.isHardwareConnected() === true) {
																																									
																																												// Return including input in the transaction with the wallet's hardware wallet
																																												return wallet.getHardwareWallet().includeInputInTransaction(input[Wallet.INPUT_AMOUNT_INDEX], input[Wallet.INPUT_IDENTIFIER_INDEX], input[Wallet.INPUT_SWITCH_TYPE_INDEX], (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function() {
																																												
																																													// Check if cancel didn't occur
																																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																														// Resolve
																																														resolve();
																																													}
																																											
																																													// Otherwise
																																													else {
																																													
																																														// Reject canceled error
																																														reject(Common.CANCELED_ERROR);
																																													}
																																												
																																												// Catch errors
																																												}).catch(function(error) {
																																												
																																													// Check if cancel didn't occur
																																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																												
																																														// Reject error
																																														reject(error);
																																													}
																																											
																																													// Otherwise
																																													else {
																																													
																																														// Reject canceled error
																																														reject(Common.CANCELED_ERROR);
																																													}
																																												});
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Reject hardware disconnected error
																																												reject(HardwareWallet.DISCONNECTED_ERROR);
																																											}
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject canceled error
																																											reject(Common.CANCELED_ERROR);
																																										}
																																									});
																																								
																																								// Catch errors
																																								}).catch(function(error) {
																																								
																																									// Return promise
																																									return new Promise(function(resolve, reject) {
																																										
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																										
																																											// Reject error
																																											reject(error);
																																										}
																																												
																																										// Otherwise
																																										else {
																																										
																																											// Reject canceled error
																																											reject(Common.CANCELED_ERROR);
																																										}
																																									});
																																								});
																																								
																																								// Append including trasnaction part to list
																																								includingTransactionParts.push(includeTransactionParts);
																																							}
																																							
																																							// Return including all transaction parts in the transaction
																																							return Promise.all(includingTransactionParts).then(function() {
																																							
																																								// Check if cancel didn't occur
																																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																								
																																									// Check if wallet's hardware wallet is connected
																																									if(wallet.isHardwareConnected() === true) {
																																									
																																										// Return applying offset to slate
																																										return slate.applyOffset(wallet.getHardwareWallet(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function() {
																																							
																																											// Check if cancel didn't occur
																																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																												// Update message
																																												var updateMessage = function() {
																																												
																																													// Return promise
																																													return new Promise(function(resolve, reject) {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																														
																																															// Check if can be canceled
																																															if(cancelOccurred !== Common.NO_CANCEL_OCCURRED) {
																																														
																																																// Disable message
																																																self.message.disable();
																																															
																																																// Return replace message
																																																return self.message.replace(Api.FINALIZE_TRANSACTION_MESSAGE, slateResponse.getReceiverAddress()).then(function(replaceResult) {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																	
																																																		// Check if a replacement message wasn't not displayed
																																																		if(replaceResult !== Message.REPLACE_NOT_DISPLAYED_RESULT) {
																																																
																																																			// Resolve
																																																			resolve();
																																																		}
																																													
																																																		// Otherwise
																																																		else {
																																																		
																																																			// Reject canceled error
																																																			reject(Common.CANCELED_ERROR);
																																																		}	
																																																	}
																																													
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject canceled error
																																																		reject(Common.CANCELED_ERROR);
																																																	}	
																																																});
																																															}
																																															
																																															// Otherwise
																																															else {
																																															
																																																// Resolve
																																																resolve();
																																															}
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject canceled error
																																															reject(Common.CANCELED_ERROR);
																																														}	
																																													});
																																												};
																																												
																																												// Return updating message
																																												return updateMessage().then(function() {
																																												
																																													// Check if cancel didn't occur
																																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																														// Check if wallet's hardware wallet is connected
																																														if(wallet.isHardwareConnected() === true) {
																																													
																																															// Return finalizing the slate response
																																															return slateResponse.finalize(wallet.getHardwareWallet(), encryptedSecretNonce, baseFee, wallet.getNetworkType() === Consensus.MAINNET_NETWORK_TYPE, true, (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function() {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Check if wallet's hardware wallet is connected
																																																	if(wallet.isHardwareConnected() === true) {
																																																	
																																																		// Return completing transaction with the wallet's hardware wallet
																																																		return wallet.getHardwareWallet().completeTransaction().then(function() {
																																																		
																																																			// Check if cancel didn't occur
																																																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																		
																																																				// Resolve
																																																				resolve();
																																																			}
																																																			
																																																			// Otherwise
																																																			else {
																																																			
																																																				// Reject canceled error
																																																				reject(Common.CANCELED_ERROR);
																																																			}
																																																			
																																																		// Catch errors
																																																		}).catch(function(error) {
																																																		
																																																			// Check if cancel didn't occur
																																																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																		
																																																				// Check if canceled
																																																				if(error === Common.CANCELED_ERROR) {
																																																				
																																																					// Reject error
																																																					reject(error);
																																																				}
																																																				
																																																				// Otherwise
																																																				else {
																																																			
																																																					// Reject error
																																																					reject(Message.createText(Language.getDefaultTranslation('Finalizing the slate failed.')));
																																																				}
																																																			}
																																																			
																																																			// Otherwise
																																																			else {
																																																			
																																																				// Reject canceled error
																																																				reject(Common.CANCELED_ERROR);
																																																			}
																																																		});
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Restore slate response kernel's old excess and excess signature
																																																		slateResponse.getKernels()[0].setExcess(slate.getKernels()[0].getExcess());
																																																		slateResponse.getKernels()[0].setExcessSignature(slate.getKernels()[0].getExcessSignature());
																																																		
																																																		// Restore slate response sender participant's old partial signature
																																																		slateResponse.getParticipant(SlateParticipant.SENDER_ID).setPartialSignature(slate.getParticipant(SlateParticipant.SENDER_ID).getPartialSignature());
																																																	
																																																		// Return finalizing slate
																																																		return finalizeSlate().then(function() {
																																																		
																																																			// Check if cancel didn't occur
																																																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																		
																																																				// Resolve
																																																				resolve();
																																																			}
																																																			
																																																			// Otherwise
																																																			else {
																																																			
																																																				// Reject canceled error
																																																				reject(Common.CANCELED_ERROR);
																																																			}
																																																		
																																																		// Catch errors
																																																		}).catch(function(error) {
																																																		
																																																			// Check if cancel didn't occur
																																																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																		
																																																				// Reject error
																																																				reject(error);
																																																			}
																																																			
																																																			// Otherwise
																																																			else {
																																																			
																																																				// Reject canceled error
																																																				reject(Common.CANCELED_ERROR);
																																																			}
																																																		});
																																																	}
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Check if wallet's hardware wallet is connected
																																																	if(wallet.isHardwareConnected() === true) {
																																																
																																																		// Return canceling transaction with the wallet's hardware wallet and catch errors
																																																		return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																																		
																																																		// Finally
																																																		}).finally(function() {
																																																	
																																																			// Reject canceled error
																																																			reject(Common.CANCELED_ERROR);
																																																		});
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject canceled error
																																																		reject(Common.CANCELED_ERROR);
																																																	}
																																																}
																																																
																																															// Catch errors
																																															}).catch(function(error) {
																																															
																																																// Check if wallet's hardware wallet is connected
																																																if(wallet.isHardwareConnected() === true) {
																																															
																																																	// Return canceling transaction with the wallet's hardware wallet and catch errors
																																																	return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																																	
																																																	// Finally
																																																	}).finally(function() {
																																																
																																																		// Check if cancel didn't occur
																																																		if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																	
																																																			// Check if hardware wallet was disconnected
																																																			if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																																			
																																																				// Check if wallet's hardware wallet is connected
																																																				if(wallet.isHardwareConnected() === true) {
																																																			
																																																					// Wallet's hardware wallet disconnect event
																																																					$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																																				
																																																						// Return finalizing slate
																																																						return finalizeSlate().then(function() {
																																																						
																																																							// Check if cancel didn't occur
																																																							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																						
																																																								// Resolve
																																																								resolve();
																																																							}
																																																							
																																																							// Otherwise
																																																							else {
																																																							
																																																								// Reject canceled error
																																																								reject(Common.CANCELED_ERROR);
																																																							}
																																																						
																																																						// Catch errors
																																																						}).catch(function(error) {
																																																						
																																																							// Check if cancel didn't occur
																																																							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																						
																																																								// Reject error
																																																								reject(error);
																																																							}
																																																							
																																																							// Otherwise
																																																							else {
																																																							
																																																								// Reject canceled error
																																																								reject(Common.CANCELED_ERROR);
																																																							}
																																																						});
																																																					});
																																																				}
																																																				
																																																				// Otherwise
																																																				else {
																																																				
																																																					// Return finalizing slate
																																																					return finalizeSlate().then(function() {
																																																					
																																																						// Check if cancel didn't occur
																																																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																					
																																																							// Resolve
																																																							resolve();
																																																						}
																																																						
																																																						// Otherwise
																																																						else {
																																																						
																																																							// Reject canceled error
																																																							reject(Common.CANCELED_ERROR);
																																																						}
																																																					
																																																					// Catch errors
																																																					}).catch(function(error) {
																																																					
																																																						// Check if cancel didn't occur
																																																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																					
																																																							// Reject error
																																																							reject(error);
																																																						}
																																																						
																																																						// Otherwise
																																																						else {
																																																						
																																																							// Reject canceled error
																																																							reject(Common.CANCELED_ERROR);
																																																						}
																																																					});
																																																				}
																																																			}
																																																			
																																																			// Otherwise check if canceled
																																																			else if(error === Common.CANCELED_ERROR) {
																																																			
																																																				// Reject error
																																																				reject(error);
																																																			}
																																																			
																																																			// Otherwise check if the user rejected on the hardware wallet
																																																			else if(error === HardwareWallet.USER_REJECTED_ERROR) {
																																																			
																																																				// Reject error
																																																				reject(Message.createText(Language.getDefaultTranslation('Finalizing the transaction on the hardware wallet was denied.')));
																																																			}
																																																			
																																																			// Otherwise
																																																			else {
																																																		
																																																				// Reject error
																																																				reject(Message.createText(Language.getDefaultTranslation('Finalizing the slate failed.')));
																																																			}
																																																		}
																																																		
																																																		// Otherwise
																																																		else {
																																																		
																																																			// Reject canceled error
																																																			reject(Common.CANCELED_ERROR);
																																																		}
																																																	});
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																
																																																		// Check if hardware wallet was disconnected
																																																		if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																																			
																																																			// Return finalizing slate
																																																			return finalizeSlate().then(function() {
																																																			
																																																				// Check if cancel didn't occur
																																																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																			
																																																					// Resolve
																																																					resolve();
																																																				}
																																																				
																																																				// Otherwise
																																																				else {
																																																				
																																																					// Reject canceled error
																																																					reject(Common.CANCELED_ERROR);
																																																				}
																																																			
																																																			// Catch errors
																																																			}).catch(function(error) {
																																																			
																																																				// Check if cancel didn't occur
																																																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																			
																																																					// Reject error
																																																					reject(error);
																																																				}
																																																				
																																																				// Otherwise
																																																				else {
																																																				
																																																					// Reject canceled error
																																																					reject(Common.CANCELED_ERROR);
																																																				}
																																																			});
																																																		}
																																																		
																																																		// Otherwise check if canceled
																																																		else if(error === Common.CANCELED_ERROR) {
																																																		
																																																			// Reject error
																																																			reject(error);
																																																		}
																																																		
																																																		// Otherwise check if the user rejected on the hardware wallet
																																																		else if(error === HardwareWallet.USER_REJECTED_ERROR) {
																																																		
																																																			// Reject error
																																																			reject(Message.createText(Language.getDefaultTranslation('Finalizing the transaction on the hardware wallet was denied.')));
																																																		}
																																																		
																																																		// Otherwise
																																																		else {
																																																	
																																																			// Reject error
																																																			reject(Message.createText(Language.getDefaultTranslation('Finalizing the slate failed.')));
																																																		}
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject canceled error
																																																		reject(Common.CANCELED_ERROR);
																																																	}
																																																}
																																															});
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Return finalizing slate
																																															return finalizeSlate().then(function() {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Resolve
																																																	resolve();
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject canceled error
																																																	reject(Common.CANCELED_ERROR);
																																																}
																																															
																																															// Catch errors
																																															}).catch(function(error) {
																																															
																																																// Check if cancel didn't occur
																																																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																															
																																																	// Reject error
																																																	reject(error);
																																																}
																																																
																																																// Otherwise
																																																else {
																																																
																																																	// Reject canceled error
																																																	reject(Common.CANCELED_ERROR);
																																																}
																																															});
																																														}
																																													}
																																													
																																													// Otherwise
																																													else {
																																													
																																														// Check if wallet's hardware wallet is connected
																																														if(wallet.isHardwareConnected() === true) {
																																													
																																															// Return canceling transaction with the wallet's hardware wallet and catch errors
																																															return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																															
																																															// Finally
																																															}).finally(function() {
																																														
																																																// Reject canceled error
																																																reject(Common.CANCELED_ERROR);
																																															});
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject canceled error
																																															reject(Common.CANCELED_ERROR);
																																														}
																																													}
																																													
																																												// Catch errors
																																												}).catch(function(error) {
																																												
																																													// Check if wallet's hardware wallet is connected
																																													if(wallet.isHardwareConnected() === true) {
																																												
																																														// Return canceling transaction with the wallet's hardware wallet and catch errors
																																														return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																														
																																														// Finally
																																														}).finally(function() {
																																													
																																															// Check if cancel didn't occur
																																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																														
																																																// Reject error
																																																reject(error);
																																															}
																																																
																																															// Otherwise
																																															else {
																																															
																																																// Reject canceled error
																																																reject(Common.CANCELED_ERROR);
																																															}
																																														});
																																													}
																																													
																																													// Otherwise
																																													else {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Reject error
																																															reject(error);
																																														}
																																															
																																														// Otherwise
																																														else {
																																														
																																															// Reject canceled error
																																															reject(Common.CANCELED_ERROR);
																																														}
																																													}
																																												});
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Check if wallet's hardware wallet is connected
																																												if(wallet.isHardwareConnected() === true) {
																																											
																																													// Return canceling transaction with the wallet's hardware wallet and catch errors
																																													return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																													
																																													// Finally
																																													}).finally(function() {
																																												
																																														// Reject canceled error
																																														reject(Common.CANCELED_ERROR);
																																													});
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Reject canceled error
																																													reject(Common.CANCELED_ERROR);
																																												}
																																											}
																																										
																																										// Catch errors
																																										}).catch(function(error) {
																																										
																																											// Check if wallet's hardware wallet is connected
																																											if(wallet.isHardwareConnected() === true) {
																																										
																																												// Return canceling transaction with the wallet's hardware wallet and catch errors
																																												return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																												
																																												// Finally
																																												}).finally(function() {
																																											
																																													// Check if cancel didn't occur
																																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																												
																																														// Check if hardware wallet was disconnected
																																														if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																														
																																															// Check if wallet's hardware wallet is connected
																																															if(wallet.isHardwareConnected() === true) {
																																														
																																																// Wallet's hardware wallet disconnect event
																																																$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																															
																																																	// Return finalizing slate
																																																	return finalizeSlate().then(function() {
																																																	
																																																		// Check if cancel didn't occur
																																																		if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																	
																																																			// Resolve
																																																			resolve();
																																																		}
																																																		
																																																		// Otherwise
																																																		else {
																																																		
																																																			// Reject canceled error
																																																			reject(Common.CANCELED_ERROR);
																																																		}
																																																	
																																																	// Catch errors
																																																	}).catch(function(error) {
																																																	
																																																		// Check if cancel didn't occur
																																																		if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																	
																																																			// Reject error
																																																			reject(error);
																																																		}
																																																		
																																																		// Otherwise
																																																		else {
																																																		
																																																			// Reject canceled error
																																																			reject(Common.CANCELED_ERROR);
																																																		}
																																																	});
																																																});
																																															}
																																															
																																															// Otherwise
																																															else {
																																															
																																																// Return finalizing slate
																																																return finalizeSlate().then(function() {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																
																																																		// Resolve
																																																		resolve();
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject canceled error
																																																		reject(Common.CANCELED_ERROR);
																																																	}
																																																
																																																// Catch errors
																																																}).catch(function(error) {
																																																
																																																	// Check if cancel didn't occur
																																																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																																
																																																		// Reject error
																																																		reject(error);
																																																	}
																																																	
																																																	// Otherwise
																																																	else {
																																																	
																																																		// Reject canceled error
																																																		reject(Common.CANCELED_ERROR);
																																																	}
																																																});
																																															}
																																														}
																																														
																																														// Otherwise check if canceled
																																														else if(error === Common.CANCELED_ERROR) {
																																														
																																															// Reject error
																																															reject(error);
																																														}
																																														
																																														// Otherwise
																																														else {
																																													
																																															// Reject error
																																															reject(Message.createText(Language.getDefaultTranslation('Finalizing the slate failed.')));
																																														}
																																													}
																																													
																																													// Otherwise
																																													else {
																																													
																																														// Reject canceled error
																																														reject(Common.CANCELED_ERROR);
																																													}
																																												});
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Check if cancel didn't occur
																																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																													// Check if hardware wallet was disconnected
																																													if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																														
																																														// Return finalizing slate
																																														return finalizeSlate().then(function() {
																																														
																																															// Check if cancel didn't occur
																																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																														
																																																// Resolve
																																																resolve();
																																															}
																																															
																																															// Otherwise
																																															else {
																																															
																																																// Reject canceled error
																																																reject(Common.CANCELED_ERROR);
																																															}
																																														
																																														// Catch errors
																																														}).catch(function(error) {
																																														
																																															// Check if cancel didn't occur
																																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																														
																																																// Reject error
																																																reject(error);
																																															}
																																															
																																															// Otherwise
																																															else {
																																															
																																																// Reject canceled error
																																																reject(Common.CANCELED_ERROR);
																																															}
																																														});
																																													}
																																													
																																													// Otherwise check if canceled
																																													else if(error === Common.CANCELED_ERROR) {
																																													
																																														// Reject error
																																														reject(error);
																																													}
																																													
																																													// Otherwise
																																													else {
																																												
																																														// Reject error
																																														reject(Message.createText(Language.getDefaultTranslation('Finalizing the slate failed.')));
																																													}
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Reject canceled error
																																													reject(Common.CANCELED_ERROR);
																																												}
																																											}
																																										});
																																									}
																																									
																																									// Otherwise
																																									else {
																																									
																																										// Return finalizing slate
																																										return finalizeSlate().then(function() {
																																										
																																											// Check if cancel didn't occur
																																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																										
																																												// Resolve
																																												resolve();
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Reject canceled error
																																												reject(Common.CANCELED_ERROR);
																																											}
																																										
																																										// Catch errors
																																										}).catch(function(error) {
																																										
																																											// Check if cancel didn't occur
																																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																										
																																												// Reject error
																																												reject(error);
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Reject canceled error
																																												reject(Common.CANCELED_ERROR);
																																											}
																																										});
																																									}
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Check if wallet's hardware wallet is connected
																																									if(wallet.isHardwareConnected() === true) {
																																								
																																										// Return canceling transaction with the wallet's hardware wallet and catch errors
																																										return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																										
																																										// Finally
																																										}).finally(function() {
																																									
																																											// Reject canceled error
																																											reject(Common.CANCELED_ERROR);
																																										});
																																									}
																																									
																																									// Otherwise
																																									else {
																																									
																																										// Reject canceled error
																																										reject(Common.CANCELED_ERROR);
																																									}
																																								}
																																								
																																							// Catch errors
																																							}).catch(function(error) {
																																							
																																								// Check if wallet's hardware wallet is connected
																																								if(wallet.isHardwareConnected() === true) {
																																							
																																									// Return canceling transaction with the wallet's hardware wallet and catch errors
																																									return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																									
																																									// Finally
																																									}).finally(function() {
																																								
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Check if hardware wallet was disconnected
																																											if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																											
																																												// Check if wallet's hardware wallet is connected
																																												if(wallet.isHardwareConnected() === true) {
																																											
																																													// Wallet's hardware wallet disconnect event
																																													$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																												
																																														// Return finalizing slate
																																														return finalizeSlate().then(function() {
																																														
																																															// Check if cancel didn't occur
																																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																														
																																																// Resolve
																																																resolve();
																																															}
																																															
																																															// Otherwise
																																															else {
																																															
																																																// Reject canceled error
																																																reject(Common.CANCELED_ERROR);
																																															}
																																														
																																														// Catch errors
																																														}).catch(function(error) {
																																														
																																															// Check if cancel didn't occur
																																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																														
																																																// Reject error
																																																reject(error);
																																															}
																																															
																																															// Otherwise
																																															else {
																																															
																																																// Reject canceled error
																																																reject(Common.CANCELED_ERROR);
																																															}
																																														});
																																													});
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Return finalizing slate
																																													return finalizeSlate().then(function() {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Resolve
																																															resolve();
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject canceled error
																																															reject(Common.CANCELED_ERROR);
																																														}
																																													
																																													// Catch errors
																																													}).catch(function(error) {
																																													
																																														// Check if cancel didn't occur
																																														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																													
																																															// Reject error
																																															reject(error);
																																														}
																																														
																																														// Otherwise
																																														else {
																																														
																																															// Reject canceled error
																																															reject(Common.CANCELED_ERROR);
																																														}
																																													});
																																												}
																																											}
																																											
																																											// Otherwise check if canceled
																																											else if(error === Common.CANCELED_ERROR) {
																																											
																																												// Reject error
																																												reject(error);
																																											}
																																											
																																											// Otherwise
																																											else {
																																										
																																												// Reject error
																																												reject(Message.createText(Language.getDefaultTranslation('Finalizing the slate failed.')));
																																											}
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject canceled error
																																											reject(Common.CANCELED_ERROR);
																																										}
																																									});
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Check if cancel didn't occur
																																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																								
																																										// Check if hardware wallet was disconnected
																																										if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																											
																																											// Return finalizing slate
																																											return finalizeSlate().then(function() {
																																											
																																												// Check if cancel didn't occur
																																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																													// Resolve
																																													resolve();
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Reject canceled error
																																													reject(Common.CANCELED_ERROR);
																																												}
																																											
																																											// Catch errors
																																											}).catch(function(error) {
																																											
																																												// Check if cancel didn't occur
																																												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																											
																																													// Reject error
																																													reject(error);
																																												}
																																												
																																												// Otherwise
																																												else {
																																												
																																													// Reject canceled error
																																													reject(Common.CANCELED_ERROR);
																																												}
																																											});
																																										}
																																										
																																										// Otherwise check if canceled
																																										else if(error === Common.CANCELED_ERROR) {
																																										
																																											// Reject error
																																											reject(error);
																																										}
																																										
																																										// Otherwise
																																										else {
																																									
																																											// Reject error
																																											reject(Message.createText(Language.getDefaultTranslation('Finalizing the slate failed.')));
																																										}
																																									}
																																									
																																									// Otherwise
																																									else {
																																									
																																										// Reject canceled error
																																										reject(Common.CANCELED_ERROR);
																																									}
																																								}
																																							});
																																						}
																																						
																																						// Otherwise
																																						else {
																																						
																																							// Check if wallet's hardware wallet is connected
																																							if(wallet.isHardwareConnected() === true) {
																																						
																																								// Return canceling transaction with the wallet's hardware wallet and catch errors
																																								return wallet.getHardwareWallet().cancelTransaction().catch(function(error) {
																																								
																																								// Finally
																																								}).finally(function() {
																																							
																																									// Reject canceled error
																																									reject(Common.CANCELED_ERROR);
																																								});
																																							}
																																							
																																							// Otherwise
																																							else {
																																							
																																								// Reject canceled error
																																								reject(Common.CANCELED_ERROR);
																																							}
																																						}
																																							
																																					// Catch errors
																																					}).catch(function(error) {
																																					
																																						// Check if cancel didn't occur
																																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																					
																																							// Check if hardware wallet was disconnected
																																							if(error === HardwareWallet.DISCONNECTED_ERROR) {
																																							
																																								// Check if wallet's hardware wallet is connected
																																								if(wallet.isHardwareConnected() === true) {
																																							
																																									// Wallet's hardware wallet disconnect event
																																									$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																																								
																																										// Return finalizing slate
																																										return finalizeSlate().then(function() {
																																										
																																											// Check if cancel didn't occur
																																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																										
																																												// Resolve
																																												resolve();
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Reject canceled error
																																												reject(Common.CANCELED_ERROR);
																																											}
																																										
																																										// Catch errors
																																										}).catch(function(error) {
																																										
																																											// Check if cancel didn't occur
																																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																										
																																												// Reject error
																																												reject(error);
																																											}
																																											
																																											// Otherwise
																																											else {
																																											
																																												// Reject canceled error
																																												reject(Common.CANCELED_ERROR);
																																											}
																																										});
																																									});
																																								}
																																								
																																								// Otherwise
																																								else {
																																								
																																									// Return finalizing slate
																																									return finalizeSlate().then(function() {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Resolve
																																											resolve();
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject canceled error
																																											reject(Common.CANCELED_ERROR);
																																										}
																																									
																																									// Catch errors
																																									}).catch(function(error) {
																																									
																																										// Check if cancel didn't occur
																																										if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																									
																																											// Reject error
																																											reject(error);
																																										}
																																										
																																										// Otherwise
																																										else {
																																										
																																											// Reject canceled error
																																											reject(Common.CANCELED_ERROR);
																																										}
																																									});
																																								}
																																							}
																																							
																																							// Otherwise check if canceled
																																							else if(error === Common.CANCELED_ERROR) {
																																							
																																								// Reject error
																																								reject(error);
																																							}
																																							
																																							// Otherwise
																																							else {
																																						
																																								// Reject error
																																								reject(Message.createText(Language.getDefaultTranslation('Finalizing the slate failed.')));
																																							}
																																						}
																																						
																																						// Otherwise
																																						else {
																																						
																																							// Reject canceled error
																																							reject(Common.CANCELED_ERROR);
																																						}
																																					});
																																				}
																																
																																				// Otherwise
																																				else {
																																				
																																					// Return finalizing slate
																																					return finalizeSlate().then(function() {
																																					
																																						// Check if cancel didn't occur
																																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																					
																																							// Resolve
																																							resolve();
																																						}
																																						
																																						// Otherwise
																																						else {
																																						
																																							// Reject canceled error
																																							reject(Common.CANCELED_ERROR);
																																						}
																																					
																																					// Catch errors
																																					}).catch(function(error) {
																																					
																																						// Check if cancel didn't occur
																																						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																					
																																							// Reject error
																																							reject(error);
																																						}
																																						
																																						// Otherwise
																																						else {
																																						
																																							// Reject canceled error
																																							reject(Common.CANCELED_ERROR);
																																						}
																																					});
																																				}
																																			}
																																			
																																			// Otherwise
																																			else {
																																			
																																				// Reject canceled error
																																				reject(Common.CANCELED_ERROR);
																																			}
																																		
																																		// Catch errors
																																		}).catch(function(error) {
																																		
																																			// Check if cancel didn't occur
																																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																																		
																																				// Check if canceled
																																				if(error === Common.CANCELED_ERROR) {
																																				
																																					// Reject error
																																					reject(error);
																																				}
																																				
																																				// Otherwise
																																				else {
																																				
																																					// Reject error
																																					reject(Message.createText(Language.getDefaultTranslation('Finalizing the slate failed.')));
																																				}
																																			}
																																			
																																			// Otherwise
																																			else {
																																			
																																				// Reject canceled error
																																				reject(Common.CANCELED_ERROR);
																																			}
																																		});
																																	}
																																}
																																
																																// Otherwise
																																else {
																																
																																	// Reject canceled error
																																	reject(Common.CANCELED_ERROR);
																																}
																															});
																														};
																														
																														// Return finalizing slate
																														return finalizeSlate().then(function() {
																														
																															// Check if cancel didn't occur
																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																															
																																// Check if can be canceled
																																if(cancelOccurred !== Common.NO_CANCEL_OCCURRED) {
																																
																																	// Disable message
																																	self.message.disable();
																																}
																																
																																// Check if wallet isn't a hardware wallet
																																if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																																
																																	// Securely clear the secret nonce
																																	secretNonce.fill(0);
																																	
																																	// Securely clear the secret key
																																	secretKey.fill(0);
																																}
																																
																																// Set will broadcast to if the slate's lock height doesn't exist or it can be in the next block
																																var willBroadcast = slateResponse.getLockHeight().isEqualTo(Slate.NO_LOCK_HEIGHT) === true || slateResponse.getLockHeight().isLessThanOrEqualTo(currentHeight.plus(1)) === true;
																																
																																// Check if returned amount isn't zero
																																if(returnedAmount.isZero() === false) {
																																
																																	// Check if slate's height is unknown
																																	if(slateResponse.getHeight() === Slate.UNKNOWN_HEIGHT) {
																																	
																																		// Set spendable height to the slate's lock height added to the number of confirmation if it exists
																																		var spendableHeight = (slateResponse.getLockHeight().isEqualTo(Slate.NO_LOCK_HEIGHT) === false) ? slateResponse.getLockHeight().plus(numberOfConfirmations.minus(1)) : Transaction.UNKNOWN_SPENDABLE_HEIGHT;
																																	}
																																	
																																	// Otherwise
																																	else {
																																
																																		// Set spendable height to the slate's height added to the number of confirmation
																																		var spendableHeight = slateResponse.getHeight().plus(numberOfConfirmations.minus(1));
																																		
																																		// Check if the slate's lock height added to the number of confirmation is greater than the spendable height
																																		if(slateResponse.getLockHeight().isEqualTo(Slate.NO_LOCK_HEIGHT) === false && slateResponse.getLockHeight().plus(numberOfConfirmations.minus(1)).isGreaterThan(spendableHeight) === true) {
																																		
																																			// Set the spendable height to the slate's lock height added to the number of confirmation
																																			spendableHeight = slateResponse.getLockHeight().plus(numberOfConfirmations.minus(1));
																																		}
																																	}
																																
																																	// Try
																																	try {
																																	
																																		// Create returned transaction
																																		var returnedTransaction = new Transaction(wallet.getWalletType(), wallet.getNetworkType(), output[Wallet.OUTPUT_COMMIT_INDEX], wallet.getKeyPath(), true, timestamp, timestamp, (slateResponse.getHeight() === Slate.UNKNOWN_HEIGHT) ? Transaction.UNKNOWN_HEIGHT : slateResponse.getHeight(), (slateResponse.getLockHeight().isEqualTo(Slate.NO_LOCK_HEIGHT) === false) ? slateResponse.getLockHeight() : Transaction.NO_LOCK_HEIGHT, false, Transaction.STATUS_UNCONFIRMED, returnedAmount, false, slateResponse.getExcess(), output[Wallet.OUTPUT_IDENTIFIER_INDEX], output[Wallet.OUTPUT_SWITCH_TYPE_INDEX], false, slate.getOffsetExcess(), Transaction.UNUSED_ID, Transaction.NO_MESSAGE, (slateResponse.getTimeToLiveCutOffHeight() !== Slate.NO_TIME_TO_LIVE_CUT_OFF_HEIGHT) ? slateResponse.getTimeToLiveCutOffHeight() : Transaction.NO_TIME_TO_LIVE_CUT_OFF_HEIGHT, false, Transaction.NO_CONFIRMED_TIMESTAMP, Transaction.NO_FEE, Transaction.NO_SENDER_ADDRESS, Transaction.NO_RECEIVER_ADDRESS, Transaction.NO_RECEIVER_SIGNATURE, Transaction.UNKNOWN_DESTINATION, spendableHeight, numberOfConfirmations, Transaction.UNUSED_SPENT_OUTPUTS, Transaction.UNUSED_CHANGE_OUTPUTS, willBroadcast, Transaction.UNKNOWN_REBROADCAST_MESSAGE);
																																	}
																																	
																																	// Catch errors
																																	catch(error) {
																																	
																																		// Reject error
																																		reject(Message.createText(Language.getDefaultTranslation('Creating transaction failed.')));
																																		
																																		// Return
																																		return;
																																	}
																																	
																																	// Append returned transaction to list
																																	updatedTransactions.push(returnedTransaction);
																																}
																																
																																// Get broadcast message
																																var broadcastMessage = slateResponse.getTransaction();
																																
																																// Try
																																try {
																																
																																	// Create sent transaction
																																	var sentTransaction = new Transaction(wallet.getWalletType(), wallet.getNetworkType(), Transaction.UNUSED_COMMIT, wallet.getKeyPath(), false, timestamp, timestamp, (slateResponse.getHeight() === Slate.UNKNOWN_HEIGHT) ? Transaction.UNKNOWN_HEIGHT : slateResponse.getHeight(), (slateResponse.getLockHeight().isEqualTo(Slate.NO_LOCK_HEIGHT) === false) ? slateResponse.getLockHeight() : Transaction.NO_LOCK_HEIGHT, false, Transaction.UNKNOWN_STATUS, amount, false, slateResponse.getExcess(), Transaction.UNKNOWN_IDENTIFIER, Transaction.UNKNOWN_SWITCH_TYPE, true, Transaction.UNUSED_KERNEL_OFFSET, slateResponse.getId(), (slateResponse.getParticipant(SlateParticipant.SENDER_ID).getMessage() !== SlateParticipant.NO_MESSAGE) ? slateResponse.getParticipant(SlateParticipant.SENDER_ID).getMessage() : Transaction.NO_MESSAGE, (slateResponse.getTimeToLiveCutOffHeight() !== Slate.NO_TIME_TO_LIVE_CUT_OFF_HEIGHT) ? slateResponse.getTimeToLiveCutOffHeight() : Transaction.NO_TIME_TO_LIVE_CUT_OFF_HEIGHT, false, Transaction.NO_CONFIRMED_TIMESTAMP, slateResponse.getFee(), (slateResponse.getSenderAddress() !== Slate.NO_SENDER_ADDRESS) ? slateResponse.getSenderAddress() : Transaction.NO_SENDER_ADDRESS, (slateResponse.getReceiverAddress() !== Slate.NO_RECEIVER_ADDRESS) ? slateResponse.getReceiverAddress() : Transaction.NO_RECEIVER_ADDRESS, (slateResponse.getReceiverSignature() !== Slate.NO_RECEIVER_SIGNATURE) ? slateResponse.getReceiverSignature() : Transaction.NO_RECEIVER_SIGNATURE, url, Transaction.UNKNOWN_SPENDABLE_HEIGHT, Transaction.UNKNOWN_REQUIRED_NUMBER_OF_CONFIRMATIONS, inputs.map(function(input) {
																																	
																																		// Return input's key path
																																		return input[Wallet.INPUT_KEY_PATH_INDEX];
																																		
																																	}), (numberOfChangeOutputs === 0) ? [] : numberOfChangeOutputs, willBroadcast, JSONBigNumber.stringify(broadcastMessage));
																																}
																																
																																// Catch errors
																																catch(error) {
																																
																																	// Reject error
																																	reject(Message.createText(Language.getDefaultTranslation('Creating transaction failed.')));
																																	
																																	// Return
																																	return;
																																}
																																
																																// Append sent transaction to list
																																updatedTransactions.push(sentTransaction);
																																
																																// Check if broadcasting transaction
																																if(willBroadcast === true) {
																															
																																	// Return broadcasting transaction to the node
																																	return self.node.broadcastTransaction(broadcastMessage).then(function() {
																																	
																																		// Resolve
																																		resolve([
																																		
																																			// Locked amount
																																			totalAmount,
																																			
																																			// Unconfirmed amount
																																			returnedAmount,
																																			
																																			// Updated transactions
																																			updatedTransactions
																																		]);
																																		
																																	// Catch errors
																																	}).catch(function(error) {
																																	
																																		// Check if error contains a message
																																		if(Node.isMessageError(error) === true) {
																																		
																																			// Reject error
																																			reject(Message.createText(Language.getDefaultTranslation('Broadcasting the transaction failed for the following reason.')) + Message.createLineBreak() + Message.createLineBreak() + "<span class=\"message contextMenu\">" + Message.createText(error[Node.ERROR_RESPONSE_INDEX]["Err"]["Internal"]) + "</span>" + Language.createTranslatableContainer("<span>", Language.getDefaultTranslation('Copy'), [], "copy", true) + Message.createLineBreak());
																																		}
																																		
																																		// Otherwise
																																		else {
																																	
																																			// Reject error
																																			reject(Message.createText(Language.getDefaultTranslation('Broadcasting the transaction failed.')));
																																		}	
																																	});
																																}
																																
																																// Otherwise
																																else {
																																
																																	// Resolve
																																	resolve([
																																	
																																		// Locked amount
																																		totalAmount,
																																		
																																		// Unconfirmed amount
																																		returnedAmount,
																																		
																																		// Updated transactions
																																		updatedTransactions
																																	]);
																																}
																															}
																															
																															// Otherwise
																															else {
																															
																																// Check if wallet isn't a hardware wallet
																																if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																																
																																	// Securely clear the secret nonce
																																	secretNonce.fill(0);
																																	
																																	// Securely clear the secret key
																																	secretKey.fill(0);
																																}
																															
																																// Reject canceled error
																																reject(Common.CANCELED_ERROR);
																															}
																														
																														// Catch errors
																														}).catch(function(error) {
																														
																															// Check if wallet isn't a hardware wallet
																															if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																															
																																// Securely clear the secret nonce
																																secretNonce.fill(0);
																																
																																// Securely clear the secret key
																																secretKey.fill(0);
																															}
																															
																															// Check if cancel didn't occur
																															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																														
																																// reject error
																																reject(error);
																															}
																															
																															// Otherwise
																															else {
																															
																																// Reject canceled error
																																reject(Common.CANCELED_ERROR);
																															}
																														});
																													}
																													
																													// Otherwise
																													else {
																													
																														// Check if wallet isn't a hardware wallet
																														if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																														
																															// Securely clear the secret nonce
																															secretNonce.fill(0);
																															
																															// Securely clear the secret key
																															secretKey.fill(0);
																														}
																														
																														// Reject canceled error
																														reject(Common.CANCELED_ERROR);
																													}
																												
																												// Catch errors
																												}).catch(function(error) {
																												
																													// Check if wallet isn't a hardware wallet
																													if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																													
																														// Securely clear the secret nonce
																														secretNonce.fill(0);
																														
																														// Securely clear the secret key
																														secretKey.fill(0);
																													}
																												
																													// Check if cancel didn't occur
																													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																											
																														// Reject error
																														reject(error);
																													}
																													
																													// Otherwise
																													else {
																													
																														// Reject canceled error
																														reject(Common.CANCELED_ERROR);
																													}
																												});
																											}
																											
																											// Otherwise
																											else {
																											
																												// Check if wallet isn't a hardware wallet
																												if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
																												
																													// Securely clear the secret nonce
																													secretNonce.fill(0);
																													
																													// Securely clear the secret key
																													secretKey.fill(0);
																												}
																												
																												// Reject canceled error
																												reject(Common.CANCELED_ERROR);
																											}
																										
																										// Catch errors
																										}).catch(function(error) {
																										
																											// Check if cancel didn't occur
																											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																										
																												// Reject error
																												reject(error);
																											}
																											
																											// Otherwise
																											else {
																											
																												// Reject canceled error
																												reject(Common.CANCELED_ERROR);
																											}
																										});
																									}
																									
																									// Otherwise
																									else {
																									
																										// Reject canceled error
																										reject(Common.CANCELED_ERROR);
																									}
																								
																								// Catch errors
																								}).catch(function(error) {
																								
																									// Check if cancel didn't occur
																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																								
																										// Reject error
																										reject(error);
																									}
																									
																									// Otherwise
																									else {
																									
																										// Reject canceled error
																										reject(Common.CANCELED_ERROR);
																									}
																								});
																							}
																									
																							// Otherwise
																							else {
																							
																								// Reject canceled error
																								reject(Common.CANCELED_ERROR);
																							}
																						
																						// Catch errors
																						}).catch(function(error) {
																						
																							// Check if cancel didn't occur
																							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																						
																								// Reject error
																								reject(error);
																							}
																							
																							// Otherwise
																							else {
																							
																								// Reject canceled error
																								reject(Common.CANCELED_ERROR);
																							}
																						});
																					}
																					
																					// Otherwise
																					else {
																					
																						// Reject canceled error
																						reject(Common.CANCELED_ERROR);
																					}
																					
																				// Catch errors
																				}).catch(function(error) {
																				
																					// Check if cancel didn't occur
																					if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																				
																						// Reject error
																						reject(error);
																					}
																					
																					// Otherwise
																					else {
																					
																						// Reject canceled error
																						reject(Common.CANCELED_ERROR);
																					}
																				});
																			}
														
																			// Otherwise
																			else {
																			
																				// Reject canceled error
																				reject(Common.CANCELED_ERROR);
																			}
																		
																		// Catch errors
																		}).catch(function(error) {
																		
																			// Check if cancel didn't occur
																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																		
																				// Reject error
																				reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
																			}
																			
																			// Otherwise
																			else {
																			
																				// Reject canceled error
																				reject(Common.CANCELED_ERROR);
																			}
																		});
																	}
														
																	// Otherwise
																	else {
																	
																		// Reject canceled error
																		reject(Common.CANCELED_ERROR);
																	}
																	
																// Catch errors
																}).catch(function(error) {
																
																	// Check if cancel didn't occur
																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																
																		// Reject error
																		reject(error);
																	}
																	
																	// Otherwise
																	else {
																	
																		// Reject canceled error
																		reject(Common.CANCELED_ERROR);
																	}
																});
															}
														}
														
														// Otherwise
														else {
														
															// Reject canceled error
															reject(Common.CANCELED_ERROR);
														}
													
													// Catch errors
													}).catch(function(error) {
													
														// Check if cancel didn't occur
														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
													
															// Reject error
															reject(error);
														}
														
														// Otherwise
														else {
														
															// Reject canceled error
															reject(Common.CANCELED_ERROR);
														}
													});
												}
											}
											
											// Otherwise
											else {
											
												// Reject canceled error
												reject(Common.CANCELED_ERROR);
											}
										
										// Catch errors
										}).catch(function(error) {
										
											// Check if cancel didn't occur
											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
										
												// Reject error
												reject(error);
											}
											
											// Otherwise
											else {
											
												// Reject canceled error
												reject(Common.CANCELED_ERROR);
											}
										});
									}
									
									// Otherwise
									else {
									
										// Reject canceled error
										reject(Common.CANCELED_ERROR);
									}
								
								// Catch errors
								}).catch(function(error) {
								
									// Check if cancel didn't occur
									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
								
										// Reject error
										reject(error);
									}
									
									// Otherwise
									else {
									
										// Reject canceled error
										reject(Common.CANCELED_ERROR);
									}
								});
							}
							
							// Otherwise
							else {
							
								// Reject canceled error
								reject(Common.CANCELED_ERROR);
							}
						
						// Catch errors
						}).catch(function(error) {
						
							// Check if cancel didn't occur
							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
						
								// Reject error
								reject(error);
							}
							
							// Otherwise
							else {
							
								// Reject canceled error
								reject(Common.CANCELED_ERROR);
							}
						});
					}
				}
				
				// Otherwise
				else {
				
					// Reject canceled error
					reject(Common.CANCELED_ERROR);
				}
			});
		}
		
		// Foreign API URL
		static get FOREIGN_API_URL() {
		
			// Return foreign API URL
			return "/v" + Api.CURRENT_FOREIGN_API_VERSION.toFixed() + "/foreign";
		}
		
		// No additional data
		static get NO_ADDITIONAL_DATA() {
		
			// Return no additional data
			return null;
		}
		
		// Check version method
		static get CHECK_VERSION_METHOD() {
		
			// Return check version method
			return "check_version";
		}
		
		// Build coinbase method
		static get BUILD_COINBASE_METHOD() {
		
			// Return build coinbase method
			return "build_coinbase";
		}
		
		// Receive transaction method
		static get RECEIVE_TRANSACTION_METHOD() {
		
			// Return receive transaction method
			return "receive_tx";
		}
		
		// Get proof address method
		static get GET_PROOF_ADDRESS_METHOD() {
		
			// Return get proof address method
			return "get_proof_address";
		}
		
		// Response response index
		static get RESPONSE_RESPONSE_INDEX() {
		
			// Return response response index
			return 0;
		}
		
		// Response method index
		static get RESPONSE_METHOD_INDEX() {
		
			// Return response response index
			return Api.RESPONSE_RESPONSE_INDEX + 1;
		}
		
		// Response additional data index
		static get RESPONSE_ADDITIONAL_DATA_INDEX() {
		
			// Return response additional data index
			return Api.RESPONSE_METHOD_INDEX + 1;
		}
		
		// Receive transaction additional data slate index
		static get RECEIVE_TRANSACTION_ADDITIONAL_DATA_SLATE_INDEX() {
		
			// Return receive transaction additional data slate index
			return 0;
		}
		
		// Receive transaction additional data commit index
		static get RECEIVE_TRANSACTION_ADDITIONAL_DATA_COMMIT_INDEX() {
		
			// Return receive transaction additional data commit index
			return Api.RECEIVE_TRANSACTION_ADDITIONAL_DATA_SLATE_INDEX + 1;
		}
		
		// Receive transaction additional data identifier index
		static get RECEIVE_TRANSACTION_ADDITIONAL_DATA_IDENTIFIER_INDEX() {
		
			// Return receive transaction additional data identifier index
			return Api.RECEIVE_TRANSACTION_ADDITIONAL_DATA_COMMIT_INDEX + 1;
		}
		
		// Receive transaction additional data switch type index
		static get RECEIVE_TRANSACTION_ADDITIONAL_DATA_SWITCH_TYPE_INDEX() {
		
			// Return receive transaction additional data switch type index
			return Api.RECEIVE_TRANSACTION_ADDITIONAL_DATA_IDENTIFIER_INDEX + 1;
		}
		
		// Fee fee index
		static get FEE_FEE_INDEX() {
		
			// Return fee fee index
			return 0;
		}
		
		// Fee amount index
		static get FEE_AMOUNT_INDEX() {
		
			// Return fee amount index
			return Api.FEE_FEE_INDEX + 1;
		}
		
		// Fee base fee index
		static get FEE_BASE_FEE_INDEX() {
		
			// Return fee base fee index
			return Api.FEE_AMOUNT_INDEX + 1;
		}
		
		// Send locked amount index
		static get SEND_LOCKED_AMOUNT_INDEX() {
		
			// Return send locked amount index
			return 0;
		}
		
		// Send unconfirmed amount index
		static get SEND_UNCONFIRMED_AMOUNT_INDEX() {
		
			// Return send unconfirmed amount index
			return Api.SEND_LOCKED_AMOUNT_INDEX + 1;
		}
		
		// Send updated transactions index
		static get SEND_UPDATED_TRANSACTIONS_INDEX() {
		
			// Return send updated transactions index
			return Api.SEND_UNCONFIRMED_AMOUNT_INDEX + 1;
		}
		
		// All amount
		static get ALL_AMOUNT() {
		
			// Return all amount
			return null;
		}
		
		// Default base fee
		static get DEFAULT_BASE_FEE() {
		
			// Check wallet type
			switch(Consensus.getWalletType()) {
			
				// MWC wallet
				case Consensus.MWC_WALLET_TYPE:
		
					// Return default base fee
					return new BigNumber(Consensus.VALUE_NUMBER_BASE).dividedToIntegerBy(1000);
				
				// GRIN wallet
				case Consensus.GRIN_WALLET_TYPE:
				
					// Return default base fee
					return new BigNumber(Consensus.VALUE_NUMBER_BASE).dividedToIntegerBy(100).dividedToIntegerBy(20);
			}
		}
		
		// Minimum base fee
		static get MINIMUM_BASE_FEE() {
		
			// Return minimum base fee
			return new BigNumber(1);
		}
		
		// Default number of confirmations
		static get DEFAULT_NUMBER_OF_CONFIRMATIONS() {
		
			// Return default number of confirmations
			return new BigNumber(10);
		}
		
		// Finalize transaction message
		static get FINALIZE_TRANSACTION_MESSAGE() {
		
			// Return finalize transaction message
			return "ApiFinalizeTransactionMessage";
		}
	
	// Private
		
		// Is compatible
		isCompatible(url, cancelOccurred = Common.NO_CANCEL_OCCURRED) {
		
			// Set self
			var self = this;
		
			// Return promise
			return new Promise(function(resolve, reject) {
			
				// Check if cancel didn't occur
				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
			
					// Get proxy request
					var proxyRequest = Tor.isTorUrl(url) === true && Tor.isSupported() === false;
					
					// Upgrade URL if applicable
					url = Common.upgradeApplicableInsecureUrl(url);
			
					// Return sending JSON-RPC request to check version
					return JsonRpc.sendRequest(((proxyRequest === true) ? self.torProxy.getAddress() : "") + Common.removeTrailingSlashes(url) + Api.FOREIGN_API_URL, Api.CHECK_VERSION_METHOD, [], {}, JsonRpc.DEFAULT_NUMBER_OF_ATTEMPTS, cancelOccurred).then(function(response) {
					
						// Check if cancel didn't occur
						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
					
							// Check if response contains a result
							if(Object.isObject(response) === true && "Ok" in response === true) {
							
								// Set response to its value
								response = response["Ok"];
								
								// Check if response's foreign API version isn't supported
								if(Object.isObject(response) === false || "foreign_api_version" in response === false || (Common.isNumberString(response["foreign_api_version"]) === false && response["foreign_api_version"] instanceof BigNumber === false) || (new BigNumber(response["foreign_api_version"])).isInteger() === false || (new BigNumber(response["foreign_api_version"])).isLessThan(Api.FOREIGN_API_VERSION_ONE) === true) {
								
									// Reject unsupported response
									reject(Message.createText(Language.getDefaultTranslation('Unsupported response from the recipient.')));
									
									// Return
									return;
								}
								
								// Get foreign API version
								var foreignApiVersion = new BigNumber(response["foreign_api_version"]);
								
								// Check if foreign API version isn't supported
								if(foreignApiVersion.isEqualTo(Api.CURRENT_FOREIGN_API_VERSION) === false) {
								
									// Reject unsupported foreign API version
									reject(Message.createText(Language.getDefaultTranslation('Recipient\'s foreign API version isn\'t supported.')));
									
									// Return
									return;
								}
								
								// Check if response's supported slate versions isn't supported
								if(Object.isObject(response) === false || "supported_slate_versions" in response === false || Array.isArray(response["supported_slate_versions"]) === false || response["supported_slate_versions"].every(function(supportedSlateVersion) {
								
									// Return if supported slate version is a string
									return typeof supportedSlateVersion === "string";
									
								}) === false) {
								
									// Reject unsupported response
									reject(Message.createText(Language.getDefaultTranslation('Unsupported response from the recipient.')));
									
									// Return
									return;
								}
								
								// Get supported slate versions
								var supportedSlateVersions = response["supported_slate_versions"];
								
								// Initialize compatible slate versions
								var compatibleSlateVersions = [];
								
								// Go through all supported slate versions
								for(var i = 0; i < supportedSlateVersions["length"]; ++i) {
								
									// Get supported slate version
									var supportedSlateVersion = supportedSlateVersions[i];
									
									// Check if supported slate version is compatible
									if(Slate.SUPPORTED_VERSIONS.indexOf(supportedSlateVersion) !== Common.INDEX_NOT_FOUND) {
									
										// Append supported slate version to list of compatible slate versions
										compatibleSlateVersions.push(supportedSlateVersion);
									}
								}
								
								// Check if there no supported slate versions are compatible
								if(compatibleSlateVersions["length"] === 0) {
								
									// Reject unsupported slate versions
									reject(Message.createText(Language.getDefaultTranslation('Recipient\'s slate versions aren\'t supported.')));
									
									// Return
									return;
								}
							
								// Resolve compatible slate versions
								resolve(compatibleSlateVersions);
							}
						
							// Otherwise
							else {
							
								// Reject invalid response
								reject(Message.createText(Language.getDefaultTranslation('Invalid response from the recipient.')));
							}
						}
				
						// Otherwise
						else {
						
							// Reject canceled error
							reject(Common.CANCELED_ERROR);
						}
					
					// Catch errors
					}).catch(function(responseStatusOrResponse) {
					
						// Check if cancel didn't occur
						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
					
							// Check if response status is provided
							if(typeof responseStatusOrResponse === "number") {
							
								// Reject status as text
								reject(self.statusToText(responseStatusOrResponse, url, proxyRequest));
							}
							
							// Otherwise check if response contains an error message
							else if(Object.isObject(responseStatusOrResponse) === true && "message" in responseStatusOrResponse === true && typeof responseStatusOrResponse["message"] === "string") {
							
								// Reject the response's error message
								reject(Message.createText(Language.getDefaultTranslation('The recipient responded with the following invalid response.')) + Message.createLineBreak() + Message.createLineBreak() + "<span class=\"message contextMenu\">" + Message.createText(responseStatusOrResponse["message"]) + "</span>" + Language.createTranslatableContainer("<span>", Language.getDefaultTranslation('Copy'), [], "copy", true) + Message.createLineBreak());
							}
							
							// Otherwise
							else {
							
								// Reject invalid response
								reject(Message.createText(Language.getDefaultTranslation('Invalid response from the recipient.')));
							}
						}
				
						// Otherwise
						else {
						
							// Reject canceled error
							reject(Common.CANCELED_ERROR);
						}
					});
				}
				
				// Otherwise
				else {
				
					// Reject canceled error
					reject(Common.CANCELED_ERROR);
				}
			});
		}
		
		// Get proof address
		getProofAddress(url, isMainnet, cancelOccurred = Common.NO_CANCEL_OCCURRED) {
		
			// Set self
			var self = this;
		
			// Return promise
			return new Promise(function(resolve, reject) {
			
				// Check if cancel didn't occur
				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
			
					// Get proxy request
					var proxyRequest = Tor.isTorUrl(url) === true && Tor.isSupported() === false;
					
					// Upgrade URL if applicable
					url = Common.upgradeApplicableInsecureUrl(url);
				
					// Return sending JSON-RPC request to get proof address
					return JsonRpc.sendRequest(((proxyRequest === true) ? self.torProxy.getAddress() : "") + Common.removeTrailingSlashes(url) + Api.FOREIGN_API_URL, Api.GET_PROOF_ADDRESS_METHOD, [], {}, JsonRpc.DEFAULT_NUMBER_OF_ATTEMPTS, cancelOccurred).then(function(response) {
					
						// Check if cancel didn't occur
						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
					
							// Check if response contains a result
							if(Object.isObject(response) === true && "Ok" in response === true) {
							
								// Set response to its value
								response = response["Ok"];
								
								// Check if response isn't supported
								if(typeof response !== "string") {
								
									// Reject unsupported response
									reject(Message.createText(Language.getDefaultTranslation('Unsupported response from the recipient.')));
									
									// Return
									return;
								}
								
								// Get proof address
								var proofAddress = response.replace(Common.DOUBLE_QUOTE_PATTERN, "");
								
								// Check wallet type
								switch(Consensus.getWalletType()) {
								
									// MWC wallet
									case Consensus.MWC_WALLET_TYPE:
								
										// Check proof address's length
										switch(proofAddress["length"]) {
										
											// Tor address length
											case Tor.ADDRESS_LENGTH:
											
												// Try
												try {
												
													// Get public key from proof address
													Tor.torAddressToPublicKey(proofAddress);
												}
												
												// Catch errors
												catch(error) {
												
													// Reject unsupported response
													reject(Message.createText(Language.getDefaultTranslation('Unsupported response from the recipient.')));
													
													// Return
													return;
												}
											
												// Break
												break;
											
											// MQS address length
											case Mqs.ADDRESS_LENGTH:
											
												// Try
												try {
												
													// Get public key from proof address
													Mqs.mqsAddressToPublicKey(proofAddress, isMainnet);
												}
												
												// Catch errors
												catch(error) {
												
													// Reject unsupported response
													reject(Message.createText(Language.getDefaultTranslation('Unsupported response from the recipient.')));
													
													// Return
													return;
												}
											
												// Break
												break;
											
											// Default
											default:
											
												// Reject unsupported response
												reject(Message.createText(Language.getDefaultTranslation('Unsupported response from the recipient.')));
												
												// Return
												return;
										}
									
										// Break
										break;
									
									// GRIN wallet
									case Consensus.GRIN_WALLET_TYPE:
									
										// Check proof address's length
										switch(proofAddress["length"]) {
										
											// Slatepack address length
											case Slatepack.ADDRESS_LENGTH:
											
												// Try
												try {
												
													// Get public key from proof address
													Slatepack.slatepackAddressToPublicKey(proofAddress);
												}
												
												// Catch errors
												catch(error) {
												
													// Reject unsupported response
													reject(Message.createText(Language.getDefaultTranslation('Unsupported response from the recipient.')));
													
													// Return
													return;
												}
											
												// Break
												break;
											
											// Default
											default:
											
												// Reject unsupported response
												reject(Message.createText(Language.getDefaultTranslation('Unsupported response from the recipient.')));
												
												// Return
												return;
										}
										
										// Break
										break;
								}
							
								// Resolve proof address
								resolve(proofAddress);
							}
							
							// Otherwise
							else {
							
								// Reject invalid response
								reject(Message.createText(Language.getDefaultTranslation('Invalid response from the recipient.')));
							}
						}
						
						// Otherwise
						else {
						
							// Reject canceled error
							reject(Common.CANCELED_ERROR);
						}	
					
					// Catch errors
					}).catch(function(responseStatusOrResponse) {
					
						// Check if cancel didn't occur
						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
					
							// Check if response status is provided
							if(typeof responseStatusOrResponse === "number") {
							
								// Reject status as text
								reject(self.statusToText(responseStatusOrResponse, url, proxyRequest));
							}
							
							// Otherwise check if response is a method not found error
							else if(Object.isObject(responseStatusOrResponse) === true && "code" in responseStatusOrResponse && responseStatusOrResponse["code"] instanceof BigNumber === true && responseStatusOrResponse["code"].isEqualTo(JsonRpc.METHOD_NOT_FOUND_ERROR) === true) {
							
								// Resolve no proof address
								resolve(Api.NO_PROOF_ADDRESS);
							}
							
							// Otherwise check if response contains an error message
							else if(Object.isObject(responseStatusOrResponse) === true && "message" in responseStatusOrResponse === true && typeof responseStatusOrResponse["message"] === "string") {
							
								// Reject the response's error message
								reject(Message.createText(Language.getDefaultTranslation('The recipient responded with the following invalid response.')) + Message.createLineBreak() + Message.createLineBreak() + "<span class=\"message contextMenu\">" + Message.createText(responseStatusOrResponse["message"]) + "</span>" + Language.createTranslatableContainer("<span>", Language.getDefaultTranslation('Copy'), [], "copy", true) + Message.createLineBreak());
							}
							
							// Otherwise
							else {
							
								// Reject invalid response
								reject(Message.createText(Language.getDefaultTranslation('Invalid response from the recipient.')));
							}
						}
						
						// Otherwise
						else {
						
							// Reject canceled error
							reject(Common.CANCELED_ERROR);
						}	
					});
				}
				
				// Otherwise
				else {
				
					// Reject canceled error
					reject(Common.CANCELED_ERROR);
				}	
			});
		}
		
		// Get slate response
		getSlateResponse(url, wallet, slate, isMainnet, cancelOccurred = Common.NO_CANCEL_OCCURRED) {
		
			// Set self
			var self = this;
		
			// Return promise
			return new Promise(function(resolve, reject) {
			
				// Check if cancel didn't occur
				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
			
					// Try
					try {
					
						// Serialzie the slate
						var serializedSlate = slate.serialize(isMainnet, Slate.COMPACT_SLATE_PURPOSE_SEND_INITIAL);
					}
					
					// Catch errors
					catch(error) {
					
						// Reject error
						reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
						
						// Return
						return;
					}
					
					// Encode slate
					var encodeSlate = function(serializedSlate) {
					
						// Return promise
						return new Promise(function(resolve, reject) {
						
							// Check if cancel didn't occur
							if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
							
								// Check if serialized slate is compact
								if(serializedSlate instanceof Uint8Array === true) {
								
									// Check if a slate has a Tor receiver address
									if(slate.getReceiverAddress() !== Slate.NO_RECEIVER_ADDRESS && slate.getReceiverAddress()["length"] === Tor.ADDRESS_LENGTH) {
								
										// Check if wallet isn't a hardware wallet
										if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
									
											// Return getting wallet's Tor secret key
											return wallet.getAddressKey(Wallet.PAYMENT_PROOF_TOR_ADDRESS_KEY_INDEX).then(function(secretKey) {
											
												// Check if cancel didn't occur
												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
												
													// Return encoding the serialized slate
													return Slatepack.encodeSlatepack(serializedSlate, secretKey, Tor.torAddressToPublicKey(slate.getReceiverAddress())).then(function(slatepack) {
													
														// Securely clear secret key
														secretKey.fill(0);
														
														// Check if cancel didn't occur
														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
														
															// Resolve the Slatepack
															resolve(slatepack);
														}
														
														// Otherwise
														else {
														
															// Reject canceled error
															reject(Common.CANCELED_ERROR);
														}
													
													// Catch errors
													}).catch(function(error) {
													
														// Securely clear secret key
														secretKey.fill(0);
														
														// Check if cancel didn't occur
														if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
														
															// Reject error
															reject(error);
														}
														
														// Otherwise
														else {
														
															// Reject canceled error
															reject(Common.CANCELED_ERROR);
														}
													});
												}
												
												// Otherwise
												else {
												
													// Securely clear secret key
													secretKey.fill(0);
												
													// Reject canceled error
													reject(Common.CANCELED_ERROR);
												}
											
											// Catch errors
											}).catch(function(error) {
											
												// Check if cancel didn't occur
												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
												
													// Reject error
													reject(error);
												}
												
												// Otherwise
												else {
												
													// Reject canceled error
													reject(Common.CANCELED_ERROR);
												}
											});
										}
										
										// Otherwise
										else {
										
											// Return waiting for wallet's hardware wallet to connect
											return self.wallets.waitForHardwareWalletToConnect(wallet.getKeyPath(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Connect the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Connect the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function() {
											
												// Check if cancel didn't occur
												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
										
													// Check if hardware wallet is connected
													if(wallet.isHardwareConnected() === true) {
													
														// Return encoding the serialized slate
														return Slatepack.encodeSlatepack(serializedSlate, wallet.getHardwareWallet(), Tor.torAddressToPublicKey(slate.getReceiverAddress()), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function(slatepack) {
														
															// Check if cancel didn't occur
															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
														
																// Resolve the Slatepack
																resolve(slatepack);
															}
															
															// Otherwise
															else {
															
																// Reject canceled error
																reject(Common.CANCELED_ERROR);
															}
															
														// Catch errors
														}).catch(function(error) {
														
															// Check if cancel didn't occur
															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
														
																// Check if hardware wallet was disconnected
																if(error === HardwareWallet.DISCONNECTED_ERROR) {
																
																	// Check if wallet's hardware wallet is connected
																	if(wallet.isHardwareConnected() === true) {
																
																		// Wallet's hardware wallet disconnect event
																		$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																	
																			// Return encoding the serialized slate
																			return encodeSlate(serializedSlate).then(function(slatepack) {
																			
																				// Check if cancel didn't occur
																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																			
																					// Resolve the Slatepack
																					resolve(slatepack);
																				}
																				
																				// Otherwise
																				else {
																				
																					// Reject canceled error
																					reject(Common.CANCELED_ERROR);
																				}
																			
																			// Catch errors
																			}).catch(function(error) {
																			
																				// Check if cancel didn't occur
																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																			
																					// Reject error
																					reject(error);
																				}
																				
																				// Otherwise
																				else {
																				
																					// Reject canceled error
																					reject(Common.CANCELED_ERROR);
																				}
																			});
																		});
																	}
																	
																	// Otherwise
																	else {
																	
																		// Return encoding the serialized slate
																		return encodeSlate(serializedSlate).then(function(slatepack) {
																		
																			// Check if cancel didn't occur
																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																		
																				// Resolve the Slatepack
																				resolve(slatepack);
																			}
																			
																			// Otherwise
																			else {
																			
																				// Reject canceled error
																				reject(Common.CANCELED_ERROR);
																			}
																		
																		// Catch errors
																		}).catch(function(error) {
																		
																			// Check if cancel didn't occur
																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																		
																				// Reject error
																				reject(error);
																			}
																			
																			// Otherwise
																			else {
																			
																				// Reject canceled error
																				reject(Common.CANCELED_ERROR);
																			}
																		});
																	}
																}
																
																// Otherwise
																else {
															
																	// Reject error
																	reject(error);
																}
															}
															
															// Otherwise
															else {
															
																// Reject canceled error
																reject(Common.CANCELED_ERROR);
															}
														});
													}
													
													// Otherwise
													else {
													
														// Return encoding the serialized slate
														return encodeSlate(serializedSlate).then(function(slatepack) {
														
															// Check if cancel didn't occur
															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
														
																// Resolve the Slatepack
																resolve(slatepack);
															}
															
															// Otherwise
															else {
															
																// Reject canceled error
																reject(Common.CANCELED_ERROR);
															}
														
														// Catch errors
														}).catch(function(error) {
														
															// Check if cancel didn't occur
															if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
														
																// Reject error
																reject(error);
															}
															
															// Otherwise
															else {
															
																// Reject canceled error
																reject(Common.CANCELED_ERROR);
															}
														});
													}
												}
																			
												// Otherwise
												else {
												
													// Reject canceled error
													reject(Common.CANCELED_ERROR);
												}
												
											// Catch errors
											}).catch(function(error) {
											
												// Check if cancel didn't occur
												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
												
													// Reject error
													reject(error);
												}
												
												// Otherwise
												else {
												
													// Reject canceled error
													reject(Common.CANCELED_ERROR);
												}
											});
										}
									}
									
									// Otherwise
									else {
									
										// Return encoding the serialized slate
										return Slatepack.encodeSlatepack(serializedSlate).then(function(slatepack) {
										
											// Check if cancel didn't occur
											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
											
												// Resolve the Slatepack
												resolve(slatepack);
											}
											
											// Otherwise
											else {
											
												// Reject canceled error
												reject(Common.CANCELED_ERROR);
											}
										
										// Catch errors
										}).catch(function(error) {
										
											// Check if cancel didn't occur
											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
											
												// Reject error
												reject(error);
											}
											
											// Otherwise
											else {
											
												// Reject canceled error
												reject(Common.CANCELED_ERROR);
											}
										});
									}
								}
								
								// Otherwise
								else {
								
									// Resolve the serialized slate
									resolve(serializedSlate);
								}
							}
							
							// Otherwise
							else {
							
								// Reject canceled error
								reject(Common.CANCELED_ERROR);
							}
						});
					};
					
					// Return encoding the slate
					return encodeSlate(serializedSlate).then(function(encodedSlate) {
					
						// Check if cancel didn't occur
						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
				
							// Get proxy request
							var proxyRequest = Tor.isTorUrl(url) === true && Tor.isSupported() === false;
							
							// Upgrade URL if applicable
							url = Common.upgradeApplicableInsecureUrl(url);
							
							// Return sending JSON-RPC request to get slate response
							return JsonRpc.sendRequest(((proxyRequest === true) ? self.torProxy.getAddress() : "") + Common.removeTrailingSlashes(url) + Api.FOREIGN_API_URL, Api.RECEIVE_TRANSACTION_METHOD, [
							
								// Slate
								encodedSlate,
								
								// Destination account name
								null,
								
								// Message
								null,
							
							], {}, JsonRpc.DEFAULT_NUMBER_OF_ATTEMPTS, cancelOccurred).then(function(response) {
							
								// Check if cancel didn't occur
								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
							
									// Check if response contains a result
									if(Object.isObject(response) === true && "Ok" in response === true) {
									
										// Set response to its value
										response = response["Ok"];
										
										// Decode slate
										var decodeSlate = function(serializedSlateOrSlatepack) {
										
											// Return promise
											return new Promise(function(resolve, reject) {
											
												// Check if cancel didn't occur
												if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
												
													// Check wallet type
													switch(Consensus.getWalletType()) {
													
														// MWC wallet
														case Consensus.MWC_WALLET_TYPE:
												
															// Set expecting Slatepack
															var expectingSlatepack = slate.isCompact() === true;
															
															// break
															break;
														
														// GRIN wallet
														case Consensus.GRIN_WALLET_TYPE:
														
															// Set expecting Slatepack
															var expectingSlatepack = false;
															
															// Break
															break;
													}
												
													// Check if a Slatepack is received and it should have been
													if(typeof serializedSlateOrSlatepack === "string" && expectingSlatepack === true) {
													
														// Get Slatepack
														var slatepack = serializedSlateOrSlatepack;
														
														// Check if Slatepack should be encrypted, it is encrypted, and it's sender public key matches the slate's receiver address
														if(slate.getReceiverAddress() !== Slate.NO_RECEIVER_ADDRESS && slate.getReceiverAddress()["length"] === Tor.ADDRESS_LENGTH && Slatepack.isEncryptedSlatepack(slatepack) === true && Slatepack.getSlatepackSenderPublicKey(slatepack) !== Slatepack.NO_PUBLIC_KEY && Tor.publicKeyToTorAddress(Slatepack.getSlatepackSenderPublicKey(slatepack)) === slate.getReceiverAddress()) {
													
															// Check if wallet isn't a hardware wallet
															if(wallet.getHardwareType() === Wallet.NO_HARDWARE_TYPE) {
														
																// Return getting wallet's Tor secret key
																return wallet.getAddressKey(Wallet.PAYMENT_PROOF_TOR_ADDRESS_KEY_INDEX).then(function(secretKey) {
																
																	// Check if cancel didn't occur
																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																	
																		// Return decoding the Slatepack
																		return Slatepack.decodeSlatepack(slatepack, secretKey).then(function(decodedSlate) {
																		
																			// Securely clear secret key
																			secretKey.fill(0);
																			
																			// Check if cancel didn't occur
																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																			
																				// Resolve the decoded slate
																				resolve(decodedSlate);
																			}
																			
																			// Otherwise
																			else {
																			
																				// Reject canceled error
																				reject(Common.CANCELED_ERROR);
																			}
																		
																		// Catch errors
																		}).catch(function(error) {
																		
																			// Securely clear secret key
																			secretKey.fill(0);
																			
																			// Check if cancel didn't occur
																			if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																			
																				// Reject error
																				reject(error);
																			}
																			
																			// Otherwise
																			else {
																			
																				// Reject canceled error
																				reject(Common.CANCELED_ERROR);
																			}
																		});
																	}
																	
																	// Otherwise
																	else {
																	
																		// Securely clear secret key
																		secretKey.fill(0);
																	
																		// Reject canceled error
																		reject(Common.CANCELED_ERROR);
																	}
																
																// Catch errors
																}).catch(function(error) {
																
																	// Check if cancel didn't occur
																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																	
																		// Reject error
																		reject(error);
																	}
																	
																	// Otherwise
																	else {
																	
																		// Reject canceled error
																		reject(Common.CANCELED_ERROR);
																	}
																});
															}
															
															// Otherwise
															else {
															
																// Return waiting for wallet's hardware wallet to connect
																return self.wallets.waitForHardwareWalletToConnect(wallet.getKeyPath(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Connect the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Connect the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function() {
																
																	// Check if cancel didn't occur
																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
															
																		// Check if hardware wallet is connected
																		if(wallet.isHardwareConnected() === true) {
																		
																			// Return decoding the Slatepack
																			return Slatepack.decodeSlatepack(slatepack, wallet.getHardwareWallet(), (wallet.getName() === Wallet.NO_NAME) ? Language.getDefaultTranslation('Unlock the hardware wallet for Wallet %1$s to continue sending the payment.') : Language.getDefaultTranslation('Unlock the hardware wallet for %1$y to continue sending the payment.'), [(wallet.getName() === Wallet.NO_NAME) ? wallet.getKeyPath().toFixed() : wallet.getName()], false, true, cancelOccurred).then(function(decodedSlate) {
																			
																				// Check if cancel didn't occur
																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																			
																					// Resolve the decoded slate
																					resolve(decodedSlate);
																				}
																				
																				// Otherwise
																				else {
																				
																					// Reject canceled error
																					reject(Common.CANCELED_ERROR);
																				}
																				
																			// Catch errors
																			}).catch(function(error) {
																			
																				// Check if cancel didn't occur
																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																			
																					// Check if hardware wallet was disconnected
																					if(error === HardwareWallet.DISCONNECTED_ERROR) {
																					
																						// Check if wallet's hardware wallet is connected
																						if(wallet.isHardwareConnected() === true) {
																					
																							// Wallet's hardware wallet disconnect event
																							$(wallet.getHardwareWallet()).one(HardwareWallet.DISCONNECT_EVENT, function() {
																						
																								// Return decoding the Slatepack
																								return decodeSlate(slatepack).then(function(decodedSlate) {
																								
																									// Check if cancel didn't occur
																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																								
																										// Resolve the decoded slate
																										resolve(decodedSlate);
																									}
																									
																									// Otherwise
																									else {
																									
																										// Reject canceled error
																										reject(Common.CANCELED_ERROR);
																									}
																								
																								// Catch errors
																								}).catch(function(error) {
																								
																									// Check if cancel didn't occur
																									if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																								
																										// Reject error
																										reject(error);
																									}
																									
																									// Otherwise
																									else {
																									
																										// Reject canceled error
																										reject(Common.CANCELED_ERROR);
																									}
																								});
																							});
																						}
																						
																						// Otherwise
																						else {
																						
																							// Return decoding the Slatepack
																							return decodeSlate(slatepack).then(function(decodedSlate) {
																							
																								// Check if cancel didn't occur
																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																							
																									// Resolve the decoded slate
																									resolve(decodedSlate);
																								}
																								
																								// Otherwise
																								else {
																								
																									// Reject canceled error
																									reject(Common.CANCELED_ERROR);
																								}
																							
																							// Catch errors
																							}).catch(function(error) {
																							
																								// Check if cancel didn't occur
																								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																							
																									// Reject error
																									reject(error);
																								}
																								
																								// Otherwise
																								else {
																								
																									// Reject canceled error
																									reject(Common.CANCELED_ERROR);
																								}
																							});
																						}
																					}
																					
																					// Otherwise
																					else {
																				
																						// Reject error
																						reject(error);
																					}
																				}
																				
																				// Otherwise
																				else {
																				
																					// Reject canceled error
																					reject(Common.CANCELED_ERROR);
																				}
																			});
																		}
																		
																		// Otherwise
																		else {
																		
																			// Return decoding the Slatepack
																			return decodeSlate(slatepack).then(function(decodedSlate) {
																			
																				// Check if cancel didn't occur
																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																			
																					// Resolve the decoded slate
																					resolve(decodedSlate);
																				}
																				
																				// Otherwise
																				else {
																				
																					// Reject canceled error
																					reject(Common.CANCELED_ERROR);
																				}
																			
																			// Catch errors
																			}).catch(function(error) {
																			
																				// Check if cancel didn't occur
																				if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																			
																					// Reject error
																					reject(error);
																				}
																				
																				// Otherwise
																				else {
																				
																					// Reject canceled error
																					reject(Common.CANCELED_ERROR);
																				}
																			});
																		}
																	}
																								
																	// Otherwise
																	else {
																	
																		// Reject canceled error
																		reject(Common.CANCELED_ERROR);
																	}
																	
																// Catch errors
																}).catch(function(error) {
																
																	// Check if cancel didn't occur
																	if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																	
																		// Reject error
																		reject(error);
																	}
																	
																	// Otherwise
																	else {
																	
																		// Reject canceled error
																		reject(Common.CANCELED_ERROR);
																	}
																});
															}
														}
														
														// Otherwise check if response should have been encrypted but it wasn't encrypted or has the wrong sender public key
														else if(slate.getReceiverAddress() !== Slate.NO_RECEIVER_ADDRESS && slate.getReceiverAddress()["length"] === Tor.ADDRESS_LENGTH) {
														
															// Reject
															reject();
														}
														
														// Otherwise check if response was encrypted when it shouldn't have been
														else if(Slatepack.isEncryptedSlatepack(slatepack) === true) {
														
															// Reject
															reject();
														}
														
														// Otherwise
														else {
														
															// Return decoding the Slatepack
															return Slatepack.decodeSlatepack(slatepack).then(function(decodedSlate) {
															
																// Check if cancel didn't occur
																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																
																	// Resolve the decoded slate
																	resolve(decodedSlate);
																}
																
																// Otherwise
																else {
																
																	// Reject canceled error
																	reject(Common.CANCELED_ERROR);
																}
															
															// Catch errors
															}).catch(function(error) {
															
																// Check if cancel didn't occur
																if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
																
																	// Reject error
																	reject(error);
																}
																
																// Otherwise
																else {
																
																	// Reject canceled error
																	reject(Common.CANCELED_ERROR);
																}
															});
														}
													}
													
													// Otherwise check if a Slatepack should have been received but it wasn't
													else if(expectingSlatepack === true) {
													
														// Reject
														reject();
													} 
													
													// Otherwise check if a serialized slate was received
													else if(Object.isObject(serializedSlateOrSlatepack) === true) {
													
														// Get decoded slate
														var decodedSlate = serializedSlateOrSlatepack;
													
														// Resolve the decoded slate
														resolve(decodedSlate);
													}
													
													// Otherwise
													else {
													
														// Reject
														reject();
													}
												}
												
												// Otherwise
												else {
												
													// Reject canceled error
													reject(Common.CANCELED_ERROR);
												}
											});
										};
										
										// Return decoding response
										return decodeSlate(response).then(function(decodedSlate) {
										
											// Check if cancel didn't occur
											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
											
												// Return parsing slate
												return Slate.parseSlateAsynchronous(decodedSlate, isMainnet, Slate.COMPACT_SLATE_PURPOSE_SEND_RESPONSE, slate).then(function(slateResponse) {
												
													// Check if cancel didn't occur
													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
												
														// Check if slate response hasn't changed too much from the sent slate
														if(slate.isEqualTo(slateResponse) === true) {
														
															// Resolve slate response
															resolve(slateResponse);
														}
														
														// Otherwise
														else {
														
															// Reject unsupported response
															reject(Message.createText(Language.getDefaultTranslation('Unsupported response from the recipient.')));
														}
													
													}
											
													// Otherwise
													else {
													
														// Reject canceled error
														reject(Common.CANCELED_ERROR);
													}
													
												// Catch errors
												}).catch(function(error) {
												
													// Check if cancel didn't occur
													if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
												
														// Reject unsupported response
														reject(Message.createText(Language.getDefaultTranslation('Unsupported response from the recipient.')));
													}
											
													// Otherwise
													else {
													
														// Reject canceled error
														reject(Common.CANCELED_ERROR);
													}
												});
											}
											
											// Otherwise
											else {
											
												// Reject canceled error
												reject(Common.CANCELED_ERROR);
											}
										
										// Catch errors
										}).catch(function(error) {
										
											// Check if cancel didn't occur
											if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
											
												// Check if canceled
												if(error === Common.CANCELED_ERROR) {
												
													// Reject error
													reject(error);
												}
												
												// Otherwise
												else {
												
													// Reject unsupported response
													reject(Message.createText(Language.getDefaultTranslation('Unsupported response from the recipient.')));
												}
											}
											
											// Otherwise
											else {
											
												// Reject canceled error
												reject(Common.CANCELED_ERROR);
											}
										});
									}
									
									// Otherwise
									else {
									
										// Reject invalid response
										reject(Message.createText(Language.getDefaultTranslation('Invalid response from the recipient.')));
									}
								}
								
								// Otherwise
								else {
								
									// Reject canceled error
									reject(Common.CANCELED_ERROR);
								}
							
							// Catch errors
							}).catch(function(responseStatusOrResponse) {
							
								// Check if cancel didn't occur
								if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
							
									// Check if response status is provided
									if(typeof responseStatusOrResponse === "number") {
									
										// Reject status as text
										reject(self.statusToText(responseStatusOrResponse, url, proxyRequest));
									}
									
									// Otherwise check if response contains an error message
									else if(Object.isObject(responseStatusOrResponse) === true && "message" in responseStatusOrResponse === true && typeof responseStatusOrResponse["message"] === "string") {
									
										// Reject the response's error message
										reject(Message.createText(Language.getDefaultTranslation('The recipient responded with the following invalid response.')) + Message.createLineBreak() + Message.createLineBreak() + "<span class=\"message contextMenu\">" + Message.createText(responseStatusOrResponse["message"]) + "</span>" + Language.createTranslatableContainer("<span>", Language.getDefaultTranslation('Copy'), [], "copy", true) + Message.createLineBreak());
									}
									
									// Otherwise
									else {
									
										// Reject invalid response
										reject(Message.createText(Language.getDefaultTranslation('Invalid response from the recipient.')));
									}
								}
								
								// Otherwise
								else {
								
									// Reject canceled error
									reject(Common.CANCELED_ERROR);
								}
							});
						}
						
						// Otherwise
						else {
						
							// Reject canceled error
							reject(Common.CANCELED_ERROR);
						}
					
					// Catch errors
					}).catch(function(error) {
					
						// Check if cancel didn't occur
						if(cancelOccurred === Common.NO_CANCEL_OCCURRED || cancelOccurred() === false) {
						
							// Check if canceled
							if(error === Common.CANCELED_ERROR) {
							
								// Reject error
								reject(error);
							}
							
							// Otherwise
							else {
							
								// Reject error
								reject(Message.createText(Language.getDefaultTranslation('Creating slate failed.')));
							}
						}
						
						// Otherwise
						else {
						
							// Reject canceled error
							reject(Common.CANCELED_ERROR);
						}
					});
				}
						
				// Otherwise
				else {
				
					// Reject canceled error
					reject(Common.CANCELED_ERROR);
				}
			});
		}
		
		// Status to text
		statusToText(status, url, proxyRequest) {
		
			// Check status
			switch(status) {
			
				// HTTP ok status
				case Common.HTTP_OK_STATUS:
				
					// Return invalid response
					return Message.createText(Language.getDefaultTranslation('Invalid response from the recipient.'));
				
				// HTTP unauthorized status
				case Common.HTTP_UNAUTHORIZED_STATUS:
				
					// Return unauthorized response
					return Message.createText(Language.getDefaultTranslation('Unauthorized response from the recipient.'));
				
				// HTTP forbidden status
				case Common.HTTP_FORBIDDEN_STATUS:
				
					// Return forbidden response
					return Message.createText(Language.getDefaultTranslation('Forbidden response from the recipient.'));
			
				// HTTP not found status
				case Common.HTTP_NOT_FOUND_STATUS:
				
					// Return not found response
					return Message.createText(Language.getDefaultTranslation('Not found response from the recipient.'));
				
				// HTTP unsupported media type status
				case Common.HTTP_UNSUPPORTED_MEDIA_TYPE_STATUS:
				
					// Return invalid request response
					return Message.createText(Language.getDefaultTranslation('Invalid request response from the recipient.'));
				
				// HTTP payload too large status
				case Common.HTTP_PAYLOAD_TOO_LARGE_STATUS:
				
					// Return payload too large response
					return Message.createText(Language.getDefaultTranslation('Payload too large response from the recipient.'));
				
				// HTTP bad gateway status or HTTP gateway timeout status
				case Common.HTTP_BAD_GATEWAY_STATUS:
				case Common.HTTP_GATEWAY_TIMEOUT_STATUS:
				
					// Check if request was proxied
					if(proxyRequest === true) {
					
						// Check if using a custom Tor proxy
						if(this.torProxy.usingCustomTorProxy() === true) {
						
							// Check if Tor proxy isn't set
							if(this.torProxy.getAddress()["length"] === 0) {
							
								// Return connecting failed with Tor proxy information
								return Message.createText(Language.getDefaultTranslation('Connecting to the recipient failed.')) + " " + Message.createText(Language.getDefaultTranslation('You\'ll need to provide a Tor proxy address to connect to the recipient.'));
							}
							
							// Otherwise
							else {
							
								// Return connecting failed with Tor proxy information
								return Message.createText(Language.getDefaultTranslation('Connecting to the recipient failed.')) + " " + Message.createText(Language.getDefaultTranslation('You may need to specify a different Tor proxy address to connect to the recipient.'));
							}
						}
						
						// Otherwise
						else {
					
							// Return connecting failed
							return Message.createText(Language.getDefaultTranslation('Connecting to the recipient failed.'));
						}
					}
					
					// Otherwise
					else {
					
						// Return error response
						return Message.createText(Language.getDefaultTranslation('Error response from the recipient.'));
					}
				
				// HTTP no response status
				case Common.HTTP_NO_RESPONSE_STATUS:
				
					// Check if not an extension and the page is connected to securely
					if(Common.isExtension() === false && (location["protocol"] === Common.HTTPS_PROTOCOL || Tor.isOnionService() === true)) {
					
						// Initialize error occurred
						var errorOccurred = false;
						
						// Try
						try {
				
							// Parse URL
							var parsedUrl = new URL(url);
						}
						
						// Catch errors
						catch(error) {
						
							// Set error occurred
							errorOccurred = true;
						}
						
						// Check if an error didn't occur
						if(errorOccurred === false) {
						
							// Check if URL will be connected to insecurely
							if(parsedUrl["protocol"] === Common.HTTP_PROTOCOL && Tor.isTorUrl(url) === false) {
							
								// Check if is an app
								if(Common.isApp() === true) {
							
									// Return connecting failed with insecure content information
									return Message.createText(Language.getDefaultTranslation('Connecting to the recipient failed.')) + " " + Message.createText(Language.getDefaultTranslation('Most browsers won\'t allow connecting to content that is served insecurely from an app that is served securely.')) + " " + Message.createText(Language.getDefaultTranslation('You may need to specify a recipient address that is served over HTTPS or as an Onion Service to connect to the recipient.'));
								}
								
								// Otherwise
								else {
								
									// Return connecting failed with insecure content information
									return Message.createText(Language.getDefaultTranslation('Connecting to the recipient failed.')) + " " + Message.createText(Language.getDefaultTranslation('Most browsers won\'t allow connecting to content that is served insecurely from a site that is served securely.')) + " " + Message.createText(Language.getDefaultTranslation('You may need to specify a recipient address that is served over HTTPS or as an Onion Service to connect to the recipient.'));
								}
							}
						}
					}
					
					// Check if using a custom Tor proxy and request was proxied
					if(this.torProxy.usingCustomTorProxy() === true && proxyRequest === true) {
					
						// Check if Tor proxy isn't set
						if(this.torProxy.getAddress()["length"] === 0) {
						
							// Return connecting failed with Tor proxy information
							return Message.createText(Language.getDefaultTranslation('Connecting to the recipient failed.')) + " " + Message.createText(Language.getDefaultTranslation('You\'ll need to provide a Tor proxy address to connect to the recipient.'));
						}
						
						// Otherwise
						else {
						
							// Return connecting failed with Tor proxy information
							return Message.createText(Language.getDefaultTranslation('Connecting to the recipient failed.')) + " " + Message.createText(Language.getDefaultTranslation('You may need to specify a different Tor proxy address to connect to the recipient.'));
						}
					}
					
					// Otherwise
					else {
					
						// Return no response
						return Message.createText(Language.getDefaultTranslation('Connecting to the recipient failed.'));
					}
				
				// Default
				default:
				
					// Return error response
					return Message.createText(Language.getDefaultTranslation('Error response from the recipient.'));
			}
		}
		
		// Foreign API version one
		static get FOREIGN_API_VERSION_ONE() {
		
			// Return foreign API version one
			return 1;
		}
		
		// Foreign API version two
		static get FOREIGN_API_VERSION_TWO() {
		
			// Return foreign API version two
			return 2;
		}
		
		// Current foreign API version
		static get CURRENT_FOREIGN_API_VERSION() {
		
			// Return current foreign API version
			return Api.FOREIGN_API_VERSION_TWO;
		}
		
		// Check version parameters length
		static get CHECK_VERSION_PARAMETERS_LENGTH() {
		
			// Return check version parameters length
			return 0;
		}
		
		// Receive transaction parameters length
		static get RECEIVE_TRANSACTION_PARAMETERS_LENGTH() {
		
			// Return receive transaction parameters length
			return 3;
		}
		
		// Receive transaction slate parameter
		static get RECEIVE_TRANSACTION_SLATE_PARAMETER_INDEX() {
		
			// Return receive transaction slate paramater index
			return 0;
		}
		
		// Get proof address parameters length
		static get GET_PROOF_ADDRESS_PARAMETERS_LENGTH() {
		
			// Return get proof address parameters length
			return 0;
		}
		
		// Coinbase slate version
		static get COINBASE_SLATE_VERSION() {
		
			// Return coinbase slate version
			return Slate.VERSION_TWO;
		}
		
		// Receive transaction expected number of slate participants
		static get RECEIVE_TRANSACTION_EXPECTED_NUMBER_OF_SLATE_PARTICIPANTS() {
		
			// Return receive transaction expected number of slate participants
			return 2;
		}
		
		// Receive transaction expected number of slate kernels
		static get RECEIVE_TRANSACTION_EXPECTED_NUMBER_OF_SLATE_KERNELS() {
		
			// Return receive transaction expected number of slate kernels
			return 1;
		}
		
		// Send transactions group size
		static get SEND_TRANSACTIONS_GROUP_SIZE() {
		
			// Return send transactions group size
			return 500;
		}
		
		// No proof address
		static get NO_PROOF_ADDRESS() {
		
			// Return no proof address
			return null;
		}
		
		// Settings enable mining API name
		static get SETTINGS_ENABLE_MINING_API_NAME() {
		
			// Return settings enable mining API name
			return "Enable Mining API";
		}
		
		// Settings enable mininig API default value
		static get SETTINGS_ENABLE_MINING_API_DEFAULT_VALUE() {
		
			// Return settings enable mininig API default value
			return false;
		}
		
		// Settings require payment proof name
		static get SETTINGS_REQUIRE_PAYMENT_PROOF_NAME() {
		
			// Return settings require payment proof name
			return "Require Payment Proof";
		}
		
		// Settings require payment proof default value
		static get SETTINGS_REQUIRE_PAYMENT_PROOF_DEFAULT_VALUE() {
		
			// Return settings require payment proof default value
			return false;
		}
}


// Main function

// Set global object's API
globalThis["Api"] = Api;
