nucleus-controller-factory
===========================
This module generates Express.js routes based on JSON configuration. Note Sequelize.js models are passed as an argument of each controller.

```javascript
var router  = express.Router();
var messages = require('../../helpers/messages');
var controllerFactory = new cf( { messages: messages } );

var orgMainConf = {
  router: router,
  //path: '/orgs',
  controllers: [
    {
      "model": models.Org,
      "cardinality": "findAll",
      "verb": "get",
      "path": "/",
      "resourceType": controllerFactory.mainResource
    },
    {
      "model": models.Org,
      "cardinality": "findOne",
      "verb": "get",
      "path": "/:org_id",
      "resourceType": controllerFactory.subResource,
      "whereAttributes": [{
        "attributeName": "id",
        "paramName": "org_id"
      }]
    }
 }

var _router = controllerFactory.setControllers( orgMainConf ); //pass controller configuration
module.exports = _router;//{ router: _router, path: orgMainConf.path };
```