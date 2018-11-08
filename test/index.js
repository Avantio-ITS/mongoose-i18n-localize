/* jshint node: true, mocha: true */
'use strict';

var mongoose = require('mongoose');

before(function name(done) {
	mongoose.connect('mongodb://localhost/mongoose-i18n-localize', { useNewUrlParser: true });
	mongoose.connection.on('error', function() {
		done(new Error('Unable to connect to database.'));
	});
	mongoose.connection.on('connected', function() {
		this.dropDatabase().then(function () {
			done();
		});
	});
});

after(async () => {
	await mongoose.disconnect();
})

describe('Mongoose I18n Localize', function() {
	require('./tests/i18n')();
});
