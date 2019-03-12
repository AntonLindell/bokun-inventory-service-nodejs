/*
 *
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
 const request = require('request');
 const querystring = require('querystring');
 var PROTO_PATH = __dirname + '/../protos/proto_plugin/plugin_api.proto';
 var fs = require('fs');
 var parseArgs = require('minimist');
 var path = require('path');
 var _ = require('lodash');
 var grpc = require('grpc');
 var protoLoader = require('@grpc/proto-loader');
 var packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {keepCase: true,
   longs: String,
   enums: String,
   defaults: true,
   oneofs: true
 });
 var pluginapi = grpc.loadPackageDefinition(packageDefinition).io.bokun.inventory.plugin.api.grpc;


 var configuration = {
  scheme: '',
  host: '',
  port: 0,
  path: '',
  service: '',
  client_id: '',
  client_secret: ''
};

var requestOptions = {};
/**
 * Helper function to set plugin configuration on every request to plugin
 */
 function setPluginConfiguration(parameters) {
  _.each(parameters, function(parameter) {
    switch (parameter.name) {
      case 'API_SCHEME': configuration.scheme = parameter.value; break;
      case 'API_HOST': configuration.host = parameter.value; break;
      case 'API_PORT': configuration.port = parameter.value; break;
      case 'API_PATH': configuration.path = parameter.value; break;
      case 'API_SERVICE': configuration.service = parameter.value; break;
      case 'API_CLIENT_ID': configuration.client_id = parameter.value; break;
      case 'API_CLIENT_SECRET': configuration.client_secret = parameter.value; break;
      default: break;
    }
  });
}

/**
 * Helper function configure LK API connection
 */
 function makeRequest(form) {
  var querystring = {
    'service': configuration.service,
    'email': configuration.client_id,
    'encrypted': configuration.client_secret
  }
  Object.assign(querystring, form);
  requestOptions = {
    method: 'GET',
    url:  
    configuration.scheme + "://" +
    configuration.host + 
    ":" + configuration.port + "/" +
    configuration.path,
    qs: querystring,
    headers: {
      'User-Agent': 'request',
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }
  // Return new promise 
  return new Promise(function(resolve, reject) {
    // Do async job
    request.get(requestOptions, function(err, resp, body) {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(body));
      }
    })
  })
};


/**
 * Configure and return plugin definition
 * @return {pluginDefinition} Returns the plugin definition for Bokun
 */
 function checkPluginDefinition() {
  var pluginDefinition;
  pluginDefinition = {
    name: "Test",
    description: "Testdesc",
    capabilities: [
    "SUPPORTS_RESERVATIONS",
    "SUPPORTS_AVAILABILITY"
    ],
    parameters: [
    {
      name: "API_SCHEME", // "https"
      type: "STRING",
      required: true
    },
    {
      name: "API_HOST", // "example.com"
      type: "STRING",
      required: true
    },
    {
      name: "API_PORT", // 80
      type: "LONG",
      required: true
    },
    {
      name: "API_PATH", // "/api"
      type: "STRING",
      required: true
    },
    {
      name: "API_SERVICE", // "bokunPlugin"
      type: "STRING",
      required: true
    },
    {
      name: "API_CLIENT_ID", // "bokun@example.com"
      type: "STRING",
      required: true
    },
    {
      name: "API_CLIENT_SECRET", // "some hash"
      type: "STRING",
      required: true
    }
    ]
  }
  return pluginDefinition;
}

/** 
 * getDefinition request handler. 
 * @param {EventEmitter} call Call object for the handler to process
 * @param {function(Error, feature)} callback Response callback
 */
 function getDefinition(call, callback) {
  console.log("In ::getDefinition");
  callback(null, checkPluginDefinition());
  console.log("Out ::getDefinition");
}


/** 
 * searchProducts request handler. Returns all products
 * @param {Writable} call Writable stream for responses with an additional
 *     request property for the request value. 
 */
 function searchProducts(call) {
  console.log("In ::searchProducts");
  setPluginConfiguration(call.request.parameters);
  makeRequest({'func': 'getProductList'})
  .then(function(productList) {
    _.each(productList, function(product) {
      call.write(product);
    });
    call.end();
    console.log("Successfully completed ::searchProducts");
  });

}

/** 
 * getProductById request handler. 
 * @param {EventEmitter} call Call object for the handler to process
 * @param {function(Error, feature)} callback Response callback
 */
 function getProductById(call, callback) {
  console.log("In ::getProductById");
  setPluginConfiguration(call.request.parameters);
  makeRequest({
    'func': 'getProductDescription', 
    'externalId': call.request.externalId
  })
  .then(function(productDescription) {
    callback(null, productDescription);
    console.log("Successfully completed ::getProductById");
  });
}

/** 
 * getAvailableProducts request handler. Returns all products available on given date range in 
 * call.request (ProductsAvailabilityRequest): request.range, request.requiredCapacity, request.externalProductIds
 * @param {Writable} call Writable stream for responses with an additional
 *     request property for the request value.
 */
 function getAvailableProducts(call) {
  console.log("In ::getAvailableProducts");
  setPluginConfiguration(call.request.parameters);
  makeRequest({
    'func': 'getAvailableProducts',
    'requiredCapactiy': call.request.requiredCapacity,
    'externalProductIds': call.request.externalProductIds,
    'range': JSON.stringify(call.request.range)
  })
  .then(function(products) {
    _.each(products, function(product) {
      call.write(product);
    });
    call.end();
    console.log("Out ::getAvailableProducts");
  });
}

/** 
 * getProductAvailability request handler. Returns all availabilities with one product on a given date range
 * @param {Writable} call Writable stream for responses with an additional
 *     request property for the request value. 
 * (ProductAvailabilityRequest) with request.productId, request.range (DatePeriod)
 */
 function getProductAvailability(call) {
  console.log("In ::getProductAvailability");
  setPluginConfiguration(call.request.parameters);
  makeRequest({
    'func': 'getProductAvailability',
    'productId': call.request.productId,
    'range': JSON.stringify(call.request.range)
  })
  .then(function(productAvailabilities) {
    _.each(productAvailabilities, function(productAvailability) {
      call.write(productAvailability);
    });
    call.end();
    console.log("Out ::getProductAvailability");
  });
}

/** 
 * createReservation request handler. 
 * @param {EventEmitter} call Call object for the handler to process
 * @param {function(Error, feature)} callback Response callback (ReservationResponse)
 * with request.reservationData (ReservationData object)
 */
 function createReservation(call, callback) {
  console.log("In ::createReservation");
  setPluginConfiguration(call.request.parameters);
  makeRequest({
    'func': 'createReservation', 
    'customerContact': JSON.stringify(call.request.reservationData.customerContact),
    'notes': call.request.reservationData.notes,
    'date': JSON.stringify(call.request.reservationData.date),
    'time': JSON.stringify(call.request.reservationData.time),
    'reservations': JSON.stringify(call.request.reservationData.reservations),
    'platformId': call.request.reservationData.platformId,
    'bookingSource': JSON.stringify(call.request.reservationData.bookingSource),
    'externalSaleId': call.request.reservationData.externalSaleId
  })
  .then(function(reservation) {
    callback(null, reservation);
    console.log("Out ::createReservation");
  });
}

/** 
 * confirmBooking request handler. 
 * @param {EventEmitter} call Call object for the handler to process (ConfirmBookingRequest)
 * @param {function(Error, feature)} callback Response callback (ConfirmBookingResponse)
 */
 function confirmBooking(call, callback) {
  console.log("In ::confirmBooking");
  setPluginConfiguration(call.request.parameters);
  makeRequest({
    'func': 'confirmBooking', 
    'reservationConfirmationCode': call.request.reservationConfirmationCode,
    'customerContact': JSON.stringify(call.request.reservationData.customerContact),
    'notes': call.request.reservationData.notes,
    'date': JSON.stringify(call.request.reservationData.date),
    'time': JSON.stringify(call.request.reservationData.time),
    'reservations': JSON.stringify(call.request.reservationData.reservations),
    'platformId': call.request.reservationData.platformId,
    'bookingSource': JSON.stringify(call.request.reservationData.bookingSource),
    'externalSaleId': call.request.reservationData.externalSaleId,
    'confirmationData': JSON.stringify(call.request.confirmationData)
  })
  .then(function(confirmation) {
    callback(null, confirmation);
    console.log("Out ::confirmBooking");
  });
}

/**
 * createAndConfirmBooking request handler. 
 * @param {EventEmitter} call Call object for the handler to process
 * @param {function(Error, feature)} callback Response callback
 */
 function createAndConfirmBooking(call, callback) {
  console.log("createAndConfirmBooking, should not be called");
}

/**
 * cancelBooking request handler. 
 * @param {EventEmitter} call Call object for the handler to process (CancelBookingRequest)
 * @param {function(Error, feature)} callback Response callback (CancelBookingResponse)
 * 
 */
 function cancelBooking(call, callback) {
  console.log("In ::cancelBooking");
  setPluginConfiguration(call.request.parameters);
  makeRequest({
    'func': 'cancelBooking', 
    'bookingConfirmationCode': call.request.bookingConfirmationCode,
    'agentCode': call.request.agentCode
  })
  .then(function(cancellation) {
    callback(null, cancellation);
    console.log("Out ::cancelBooking");
  });
}

/**
 * Get a new server with the handler functions in this file bound to the methods
 * it serves.
 * @return {Server} The new server object
 */
 function getServer() {
  var server = new grpc.Server();
  server.addService(pluginapi.PluginApi.service, {
    getDefinition: getDefinition,
    searchProducts: searchProducts,
    getProductById: getProductById,
    getAvailableProducts: getAvailableProducts,
    getProductAvailability: getProductAvailability,
    createReservation: createReservation,
    confirmBooking: confirmBooking,
    createAndConfirmBooking: createAndConfirmBooking,
    cancelBooking: cancelBooking
  });
  return server;
}

if (require.main === module) {
  // If this is run as a script, start a server on an unused port
  var pluginApiServer = getServer();
  pluginApiServer.bind('0.0.0.0:8080', grpc.ServerCredentials.createInsecure());
  pluginApiServer.start();
}

exports.getServer = getServer;
