"use strict";

//var utils = require('../helpers/utils');

function controllerFactory( options ){
  var messages = options.messages;
  function setControllers( options ) {
    options.controllers.forEach( function( option ) {
      option.router = options.router;
      option.router = option.resourceType( option );
    } );
    options.router.path = options.path;
    return options.router;
  }

  /*
  * The main difference between mainResource and subResource is support for table describe (query parameter)
  */
  function mainResource( options ) {
    options.router[ options.verb ]( options.path , function(req, res) {
      var where = utils.tryToParseJSON( req.query.where, messages.PARSE_ERROR_WHERE_PARAM, {} );
      if( req.query.describe && req.query.describe === 'true' ){ // returns table description
        options.model.describe()
            .then( function( describe ){
              res.json( describe );
            } )
      } else{
        options.model[ options.cardinality ]({
              where: where,
              attributes: utils.tryToParseJSON( req.query.attributes, messages.PARSE_ERROR_ATTRIBUTE_PARAM, options.model.listAttributes),
              offset: req.query.offset || 0,
              limit: utils.getLimit( req.query.limit ),
              order: req.query.order || [],
              include:  utils.getIncludes( req.query.include )
            })
            .then( function( items ){
              res.json( items );
            })
            .catch( function( error ){
              utils.sendError( 400, error, req, res );
            });
      }
    });
    return options.router;
  }

  /*
  * subResource does not support table describe query parameter.
  */
  function subResource( options ) {
    options.router[ options.verb ]( options.path, function(req, res) {
      var _where = extractParams( options, req );
      var where = options.model.sequelize.Utils._.merge( _where, utils.tryToParseJSON( req.query.where, messages.PARSE_ERROR_WHERE_PARAM, null ) )
      options.model[ options.cardinality ]({
        where: where,
        attributes: utils.tryToParseJSON(req.query.attributes, messages.PARSE_ERROR_ATTRIBUTE_PARAM, options.model.listAttributes),
        offset: req.query.offset || 0,
        limit: utils.getLimit( req.query.limit ),
        order: req.query.order || [],
        include: utils.getIncludes( req.query.include )
      })
          .then(function( resource ) {
            if( !resource ) res.json(404, {code: 404, message: "Resource not found."})
            res.json( resource );
          })
          .catch( function( error ){
            utils.sendError( 500, error, req, res );
          }) ;
    });
    return options.router;
  }

  return {
    setControllers: setControllers,
    mainResource: mainResource,
    subResource: subResource
  }
}

/*
* Dynamically generates where object with attributes from the request object
 */
function extractParams( options, req ){
  var _where = { };
  options.whereAttributes.forEach( function( attr ) {
    var operator = attr.operator || "$eq";
    _where[ attr.attributeName ] = { };
    var value = req.params[ attr.paramName ];
    // if operator is like concatenate % before and after
    if( operator === '$like' ){
      value = '%'.concat( value.concat('%'));
    }
    _where[ attr.attributeName ][operator] = value;//req.params[ attr.paramName ];
  } );
  return _where;
}

module.exports = controllerFactory;