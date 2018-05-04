/* jshint node: true */
'use strict';

var mongoose = require('mongoose');
var mongooseI18n = require('../index');

module.exports = {

	afterEach: function (done) {
		for (var key in mongoose.connection.collections) {
			mongoose.connection.collections[key].remove();
		}

		mongoose.models = {};
		mongoose.modelSchemas = {};
		mongoose.connection.models = {};
		done();
	},

	createI18nSchema: function () {
		return new mongoose.Schema({
			name: {
				type: String,
				i18n: true
			},
			date: {
				type: Date,
				i18n: true
			},
			number: {
				type: Number,
				i18n: true
			},
			bool: {
				type: Boolean,
				i18n: true
			}
		});
	},

	createI18nWithReferenceSchema: function () {
		return new mongoose.Schema({
			name: {
				type: String,
				i18n: true
			},
			reference: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Reference'
			}
		});
	},

	createI18nNestedObjectSchema: function () {
		return new mongoose.Schema({
			nested: {
				name: {
					type: String,
					i18n: true
				}
			}
		});
	},

	createI18nNestedObjectSchemaWithMultipleFields: function () {
		return new mongoose.Schema({
			nested: {
				name: {
					type: String,
					i18n: true
				}
			},
			name: {
				type: String,
				i18n: true
			}
		});
	},

	createI18nNestedArraySchema: function () {
		return new mongoose.Schema({
			nested: [{
				name: {
					type: String,
					i18n: true
				}
			}]
		});
	},

	createI18nNestedNestedArraySchema: function () {
		return new mongoose.Schema({
			nested: [{
				nested: [{
					name: {
						type: String,
						i18n: true
					}
				}]
			}]
		});
	},

	createI18nNestedSchema: function () {
		var nestedSchema = new mongoose.Schema({
			name: {
				type: String,
				i18n: true
			}
		});

		nestedSchema.plugin(mongooseI18n, {
			locales: ['en', 'de']
		});

		return new mongoose.Schema({
			nested: nestedSchema
		});
	},

	createI18nNestedSchemaArray: function () {
		var nestedSchema = new mongoose.Schema({
			name: {
				type: String,
				i18n: true
			}
		});

		nestedSchema.plugin(mongooseI18n, {
			locales: ['en', 'de']
		});

		return new mongoose.Schema({
			nested: [nestedSchema]
		});
	},

	createI18nValidationSchema: function () {
		return new mongoose.Schema({
			name: {
				type: String,
				i18n: true,
				unique: true,
				required: true,
				minlength: 3,
				validate: {
					validator: function (v) {
						return /^[A-Z]+$/i.test(v);
					},
					message: 'Custom validator failed.'
				}
			}
		});
	}
};