"use strict";

var debug = require('debug')('routerFactory');

function routerFactory(){
  function setControllers( options ) {
    var router = options.router;
    options.routers.forEach( function( routerSpec ) {
      var mwFunction = middleware ( routerSpec, options );
      router[ routerSpec.verb ]( routerSpec.path, mwFunction);
    } );
    return options.router;
  }

  /*
  * The main difference between mainResource and subResource is support for table describe (query parameter)
  */
  function middleware( routerSpec, options ) {
    return middlewareBuilder.bind( { routerSpec: routerSpec, options: options } );
  }

  function middlewareBuilder( req, res ) {
    var routerSpec = this.routerSpec;
    var where = extractParams( routerSpec, req, this.options );
    var utils = this.options.utils;
    var model = utils.models[ routerSpec.model ];
    debug( 'WHERE', where );
    if( req.query.describe && req.query.describe === 'true' ){ // returns table description
      res.json( {"message": "not implemented yet"} );
      /*options.model.describe()
       .then( function( describe ){
       res.json( describe );
       } )*/
    } else{
      model[ routerSpec.cardinality ]( {
        where: where,
        attributes: utils.tryToParseJSON( req.query.attributes, utils.messages.PARSE_ERROR_ATTRIBUTE_PARAM, model.listAttributes),
        offset: req.query.offset || 0,
        limit: utils.getLimit( req.query.limit ),
        order: req.query.order || [],
        include:  utils.getIncludes( utils.models, req.query.include )
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

  return {
    setControllers: setControllers
  }
}

/*
* Dynamically generates where object with attributes from the request object
 */
function extractParams( routeSpec, req, options ){
  var _where = { };
  var utils = options.utils;
  debug('extractParams', routeSpec.whereAttributes);
  ( routeSpec.whereAttributes || [] ).forEach( function( attr ) {
    var operator = attr.operator || "$eq";
    _where[ attr.attributeName ] = { };
    var value = req.params[ attr.paramName ];
    // if operator is like concatenate % before and after
    if( operator === '$like' ){
      value = '%'.concat( value.concat('%'));
    }
    _where[ attr.attributeName ][operator] = value;//req.params[ attr.paramName ];
  } );
  var where = utils.db_connections.sequelize.Utils._.merge( _where, utils.tryToParseJSON( req.query.where, utils.messages.PARSE_ERROR_WHERE_PARAM, null ) );
  debug('extractParams_before_merged', where);
  where = utils.db_connections.sequelize.Utils._.merge( where, applySecurity(  routeSpec, req.security.account_list, where ) );
  debug('extractParams_merged', where);
  return where;
}

function applySecurity( options, account_list, where ) {
  debug('applySecurity', options.securityAttributeName);
  debug('applySecurity', account_list);
  var _where = {}
  if( account_list && account_list.length > 0 && account_list[0] !== '*' ){
    _where[ options.securityAttributeName || 'account_id' ] = { $in: account_list };
  } else if( !account_list ){
    throw new Error("User Credentials require user account mapping.");
  }
  return _where;
}

module.exports = routerFactory;