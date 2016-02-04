"use strict";

var debug = require('debug')('controllerFactory');

function routerFactory( options ){
  var messages = options.messages;
  var utils = options.utils;//require('../helpers/utils');
  function setControllers( options ) {
    var middlewareFunctions = {};
    options.controllers.forEach( function( option ) {
      option.router = options.router;
      option.models = options.models;
      //option.resourceType( option );
      var mwFunction = middleware ( option );
      option.router[ option.verb ]( option.path, mwFunction);
      //return option.router;
    } );
    //options.router.path = options.path;
    return options.router;
  }

  /*
  * The main difference between mainResource and subResource is support for table describe (query parameter)
  */
  function middleware( option ) {
    return middlewareBuilder.bind( { option: option } );
  }

  function middlewareBuilder( req, res ) {
    var options = this.option;
    var where = extractParams( options, req, utils, messages );
    debug( 'WHERE', where );
    if( req.query.describe && req.query.describe === 'true' ){ // returns table description
      res.json( {"message": "not implemented yet"} );
      /*options.model.describe()
       .then( function( describe ){
       res.json( describe );
       } )*/
    } else{
      options.model[ options.cardinality ]( {
        where: where,
        attributes: utils.tryToParseJSON( req.query.attributes, messages.PARSE_ERROR_ATTRIBUTE_PARAM, options.model.listAttributes),
        offset: req.query.offset || 0,
        limit: utils.getLimit( req.query.limit ),
        order: req.query.order || [],
        include:  utils.getIncludes( options.models, req.query.include )
      } )
          .then( function( items ){
            if( !items || items.length == 0 ) res.status(404).json( { code: "404", message: "Resource not found." } );
            else res.json( {  entities: items} );
          })
          .catch( function( error ){
            utils.sendError( "500", error, req, res );
          });
    }
  };

  /*
  * subResource does not support table describe query parameter.
  */
/*  function subResource( options ) {
    options.router[ options.verb ]( options.path, function(req, res) {
      var where = extractParams( options, req, utils, messages );
      options.model[ options.cardinality ]({
        where: where,
        attributes: utils.tryToParseJSON(req.query.attributes, messages.PARSE_ERROR_ATTRIBUTE_PARAM, options.model.listAttributes),
        offset: req.query.offset || 0,
        limit: utils.getLimit( req.query.limit ),
        order: req.query.order || [],
        include: utils.getIncludes( options.models, req.query.include )
      })
          .then(function( resource ) {
            if( !resource || resource.length == 0 ) res.json(404, {code: 404, message: "Resource not found."})
            else res.json( resource );
          })
          .catch( function( error ){
            utils.sendError( 500, error, req, res );
          }) ;
    });
    return options.router;
  }*/

  return {
    setControllers: setControllers,
/*
    mainResource: mainResource,
    subResource: subResource
*/
  }
}

/*
* Dynamically generates where object with attributes from the request object
 */
function extractParams( options, req, utils, messages ){
  var _where = { };
  ( options.whereAttributes || [] ).forEach( function( attr ) {
    var operator = attr.operator || "$eq";
    _where[ attr.attributeName ] = { };
    var value = req.params[ attr.paramName ];
    // if operator is like concatenate % before and after
    if( operator === '$like' ){
      value = '%'.concat( value.concat('%'));
    }
    _where[ attr.attributeName ][operator] = value;//req.params[ attr.paramName ];
  } );
  var where = options.model.sequelize.Utils._.merge( _where, utils.tryToParseJSON( req.query.where, messages.PARSE_ERROR_WHERE_PARAM, null ) );
  where = applySecurity(  req.security.account_list, where );
  debug('extractParams', where);
  return where;
}

function applySecurity( account_list, where ) {
  debug('applySecurity', account_list);
  if( account_list && account_list.length > 0 && account_list[0] !== '*' ){
    where['account_id'] = { $in: account_list };
  } else if( !account_list ){
    throw new Error("User Credentials require user account mapping.");
  }
  return where;
}

module.exports = routerFactory;