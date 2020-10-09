'use strict';
const snowflake = require('node-snowflake').Snowflake;
snowflake.init({ worker_id: 1, data_center_id: 1, sequence: 0 });

module.exports = () => {
  return snowflake.nextId();
};

