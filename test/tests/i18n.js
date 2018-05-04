/* jshint node: true, mocha: true */
'use strict';

var mongoose = require('mongoose'),
	should = require('should'),
	helper = require('../helper'),
	mongooseI18n = require('../../index');
	
if (global.Promise) {
	mongoose.Promise = global.Promise;
}

module.exports = function () {

	describe('Configuration', function () {
		afterEach(helper.afterEach);


		it('should define defaultLocale from locales', function (done) {
			var Model = mongoose.model('I18nSchema', helper.createI18nSchema().plugin(mongooseI18n, {
					locales: ['en', 'de'],
					defaultLocale: 'fr'
				})),
				data = {
					name: {
						en: 'hello',
						de: 'hallo',
						fr: 'bonjour'
					}
				},
				doc = new Model(data),
				methods = {
					toJSONLocalized: {
						only: false
					},
					toJSONLocalizedOnly: {
						only: true
					},
					toObjectLocalized: {
						only: false
					},
					toObjectLocalizedOnly: {
						only: true
					},
				};
			for (var method in methods) {
				if (methods.hasOwnProperty(method)) {
					var methodOpts = methods[method],
						formattedDocs = [doc[method](), doc[method]('en'), doc[method]('fr', 'en'), doc[method]('fr'), doc[method](doc), doc[method](doc, 'en'), doc[method](doc, 'fr', 'en')];
					formattedDocs.forEach(function (formattedDoc) {
						if (methodOpts.only) {
							formattedDoc.name.should.equal(data.name.en);
						} else {
							formattedDoc.name.localized.should.equal(data.name.en);
						}
					}, this);
				}
			}
			done();
		});

		it('should store i18n fields in nested schema', function (done) {
			var Model = mongoose.model('I18nNestedSchema', helper.createI18nNestedSchema().plugin(mongooseI18n));

			var model = new Model({
				nested: {
					name: {
						en: 'hello',
						de: 'hallo'
					}
				}
			});

			model.nested.name.en.should.equal('hello');
			model.nested.name.de.should.equal('hallo');

			var json = Model.schema.methods.toJSONLocalized(model, 'de');
			json.nested.name.en.should.equal('hello');
			json.nested.name.de.should.equal('hallo');
			should.equal(json.nested.name.localized, 'hallo');

			var obj = Model.schema.methods.toObjectLocalized(model, 'en');
			obj.nested.name.en.should.equal('hello');
			obj.nested.name.de.should.equal('hallo');
			obj.nested.name.localized.should.equal('hello');

			done();
		});

		it('should store i18n fields in nested schema array', function (done) {
			var Model = mongoose.model('I18nNestedSchemaArray', helper.createI18nNestedSchemaArray().plugin(mongooseI18n));

			var model = new Model({
				nested: [{
					name: {
						en: 'hello',
						de: 'hallo'
					}
				}]
			});

			model.nested[0].name.en.should.equal('hello');
			model.nested[0].name.de.should.equal('hallo');

			var json = Model.schema.methods.toJSONLocalized(model, 'de');
			json.nested[0].name.en.should.equal('hello');
			json.nested[0].name.de.should.equal('hallo');
			json.nested[0].name.localized.should.equal('hallo');

			var obj = Model.schema.methods.toObjectLocalized(model, 'en');
			obj.nested[0].name.en.should.equal('hello');
			obj.nested[0].name.de.should.equal('hallo');
			obj.nested[0].name.localized.should.equal('hello');

			done();
		});

		it('should adopt validation for every i18n field', function (done) {
			var Model = mongoose.model('I18nValidationSchema', helper.createI18nValidationSchema().plugin(mongooseI18n, {
				locales: ['en', 'de']
			}));
			Model.on('index', function name(merr) {

				new Model().save(function (err) {
					should.exist(err);
					err.errors['name.en'].kind.should.equal('required');
					err.errors['name.de'].kind.should.equal('required');

					new Model({
						name: {
							en: 'a',
							de: '123'
						}
					}).save(function (err) {
						should.exist(err);
						err.errors['name.en'].kind.should.equal('minlength');
						err.errors['name.de'].kind.should.equal('user defined');

						new Model({
							name: {
								en: 'abc',
								de: 'abc'
							}
						}).save(function (err) {
							should.not.exist(err);

							new Model({
								name: {
									en: 'abc',
									de: 'def'
								}
							}).save(function (err, doc) {
								should.exist(err);
								err.message.should.match(/dup key/);
								err.message.should.match(/name.en/);

								done();
							});
						});
					});
				});
			});
		});

	});

	describe('Consumption', function () {
		afterEach(helper.afterEach);

		it('should store i18n fields', function (done) {
			var Model = mongoose.model('I18nSchema', helper.createI18nSchema().plugin(mongooseI18n, {
					locales: ['en', 'de']
				})),
				locales = {
					en: true,
					de: true,
					fr: false
				},
				data = {
					name: {
						en: 'hello',
						de: 'hallo',
						fr: 'bonjour'
					},
					date: {
						en: new Date(2000, 1),
						de: new Date(2000, 2),
						fr: new Date(2000, 3)
					},
					number: {
						en: 1,
						de: 2,
						fr: 3
					},
					bool: {
						en: true,
						de: false,
						fr: true
					}
				},
				doc = new Model(data),
				formattedDocs = {
					toJSONLocalized: {
						locale: 'de',
						data: doc.toJSONLocalized(doc, 'de')
					},
					toJSONLocalizedOnly: {
						locale: 'de',
						only: true,
						data: doc.toJSONLocalizedOnly(doc, 'de')
					},
					toObjectLocalized: {
						locale: 'en',
						data: doc.toObjectLocalized(doc, 'en')
					},
					toObjectLocalizedOnly: {
						locale: 'en',
						only: true,
						data: doc.toObjectLocalizedOnly(doc, 'en')
					},
				};

			for (var field in data) {
				if (data.hasOwnProperty(field)) {
					var el = data[field],
						localeName, method, methodData, methodLocaleName;
					for (localeName in locales) {
						if (locales.hasOwnProperty(localeName)) {
							var exists = locales[localeName];
							if (exists) {
								doc[field][localeName].toString().should.equal(el[localeName].toString(), 'document.' + field + '.' + localeName + ' should be equal ' + el[localeName].toString());
								for (method in formattedDocs) {
									if (formattedDocs.hasOwnProperty(method)) {
										if (!formattedDocs[method].only) {
											formattedDocs[method].data[field][localeName].toString().should.equal(el[localeName].toString(), 'document.' + method + '().' + field + '.' + localeName + ' should be equal ' + el[localeName].toString());
										}
									}
								}
							} else {
								should.not.exist(doc[field][localeName], 'document.' + field + '.' + localeName + ' shouldn\'t exist, got ' + el.fr);
							}

						}
					}
					for (method in formattedDocs) {
						if (formattedDocs.hasOwnProperty(method)) {
							methodLocaleName = formattedDocs[method].locale;
							methodData = formattedDocs[method].only ? formattedDocs[method].data[field] : formattedDocs[method].data[field].localized;
							methodData.toString().should.equal(el[methodLocaleName].toString(), 'document.' + method + '().' + field + '.' + methodLocaleName + (formattedDocs[method].only ? '' : '.localized') + ' should be equal ' + el[methodLocaleName].toString());
						}
					}
				}
			}

			done();
		});

		it('should understand different method morphology', function (done) {
			var Model = mongoose.model('I18nSchema', helper.createI18nSchema().plugin(mongooseI18n, {
					locales: ['en', 'de']
				})),
				data = {
					name: {
						en: 'hello',
						de: 'hallo',
						fr: 'bonjour'
					}
				},
				doc = new Model(data),
				methods = {
					toJSONLocalized: {
						only: false
					},
					toJSONLocalizedOnly: {
						only: true
					},
					toObjectLocalized: {
						only: false
					},
					toObjectLocalizedOnly: {
						only: true
					},
				};
			for (var method in methods) {
				if (methods.hasOwnProperty(method)) {
					var methodOpts = methods[method],
						formattedDocs = [doc[method](), doc[method]('en'), doc[method]('fr', 'en'), doc[method]('fr'), doc[method](doc), doc[method](doc, 'en'), doc[method](doc, 'fr', 'en')];
					formattedDocs.forEach(function (formattedDoc) {
						if (methodOpts.only) {
							formattedDoc.name.should.equal(data.name.en);
						} else {
							formattedDoc.name.localized.should.equal(data.name.en);
						}
					}, this);
				}
			}
			done();
		});

		it('should store i18n fields in nested object', function (done) {
			var Model = mongoose.model('I18nNestedObjectSchema', helper.createI18nNestedObjectSchema().plugin(mongooseI18n, {
				locales: ['en', 'de']
			}));

			var model = new Model({
				nested: {
					name: {
						en: 'hello',
						de: 'hallo'
					}
				}
			});

			model.nested.name.en.should.equal('hello');
			model.nested.name.de.should.equal('hallo');

			var json = Model.schema.methods.toJSONLocalized(model, 'de');
			json.nested.name.en.should.equal('hello');
			json.nested.name.de.should.equal('hallo');
			json.nested.name.localized.should.equal('hallo');

			var obj = Model.schema.methods.toObjectLocalized(model, 'en');
			obj.nested.name.en.should.equal('hello');
			obj.nested.name.de.should.equal('hallo');
			obj.nested.name.localized.should.equal('hello');

			done();
		});

		it('should store i18n fields with empty nested objects', function (done) {
			var Model = mongoose.model('I18nNestedObjectSchema', helper.createI18nNestedObjectSchemaWithMultipleFields().plugin(mongooseI18n, {
				locales: ['en', 'de']
			}));

			var model = new Model({
				name: {
					en: 'hello',
					de: 'hallo'
				}
			});

			model.name.en.should.equal('hello');
			model.name.de.should.equal('hallo');

			var json = Model.schema.methods.toJSONLocalized(model, 'de');
			json.name.en.should.equal('hello');
			json.name.de.should.equal('hallo');
			json.name.localized.should.equal('hallo');

			var obj = Model.schema.methods.toObjectLocalized(model, 'en');
			obj.name.en.should.equal('hello');
			obj.name.de.should.equal('hallo');
			obj.name.localized.should.equal('hello');

			done();
		});

		it('should store i18n fields in nested array', function (done) {
			var Model = mongoose.model('I18nNestedArraySchema', helper.createI18nNestedArraySchema().plugin(mongooseI18n, {
				locales: ['en', 'de']
			}));

			var model = new Model({
				nested: [{
					name: {
						en: 'hello',
						de: 'hallo'
					}
				}, {
					name: {
						en: 'bye',
						de: 'auf wiedersehen'
					}
				}]
			});

			model.nested[0].name.en.should.equal('hello');
			model.nested[0].name.de.should.equal('hallo');
			model.nested[1].name.en.should.equal('bye');
			model.nested[1].name.de.should.equal('auf wiedersehen');

			var json = Model.schema.methods.toJSONLocalized(model, 'de');
			json.nested[0].name.en.should.equal('hello');
			json.nested[0].name.de.should.equal('hallo');
			json.nested[0].name.localized.should.equal('hallo');
			json.nested[1].name.en.should.equal('bye');
			json.nested[1].name.de.should.equal('auf wiedersehen');
			json.nested[1].name.localized.should.equal('auf wiedersehen');

			var obj = Model.schema.methods.toObjectLocalized(model, 'en');
			obj.nested[0].name.en.should.equal('hello');
			obj.nested[0].name.de.should.equal('hallo');
			obj.nested[0].name.localized.should.equal('hello');
			obj.nested[1].name.en.should.equal('bye');
			obj.nested[1].name.de.should.equal('auf wiedersehen');
			obj.nested[1].name.localized.should.equal('bye');

			done();
		});

		it('should store i18n fields in nested nested array', function (done) {
			var Model = mongoose.model('I18nNestedNestedArraySchema', helper.createI18nNestedNestedArraySchema().plugin(mongooseI18n, {
				locales: ['en', 'de']
			}));

			var model = new Model({
				nested: [{
					nested: [{
						name: {
							en: 'hello',
							de: 'hallo'
						}
					}, {
						name: {
							en: 'bye',
							de: 'auf wiedersehen'
						}
					}]
				}]
			});

			model.nested[0].nested[0].name.en.should.equal('hello');
			model.nested[0].nested[0].name.de.should.equal('hallo');
			model.nested[0].nested[1].name.en.should.equal('bye');
			model.nested[0].nested[1].name.de.should.equal('auf wiedersehen');

			var json = Model.schema.methods.toJSONLocalized(model, 'de');
			json.nested[0].nested[0].name.en.should.equal('hello');
			json.nested[0].nested[0].name.de.should.equal('hallo');
			json.nested[0].nested[0].name.localized.should.equal('hallo');
			json.nested[0].nested[1].name.en.should.equal('bye');
			json.nested[0].nested[1].name.de.should.equal('auf wiedersehen');
			json.nested[0].nested[1].name.localized.should.equal('auf wiedersehen');

			var obj = Model.schema.methods.toObjectLocalized(model, 'en');
			obj.nested[0].nested[0].name.en.should.equal('hello');
			obj.nested[0].nested[0].name.de.should.equal('hallo');
			obj.nested[0].nested[0].name.localized.should.equal('hello');
			obj.nested[0].nested[1].name.en.should.equal('bye');
			obj.nested[0].nested[1].name.de.should.equal('auf wiedersehen');
			obj.nested[0].nested[1].name.localized.should.equal('bye');

			done();
		});

		it('should store i18n fields in populated fields', function (done) {
			var Model = mongoose.model('Reference', helper.createI18nSchema().plugin(mongooseI18n, {
				locales: ['en', 'de']
			}));

			var ModelWithReference = mongoose.model('ModelWithReference', helper.createI18nWithReferenceSchema().plugin(mongooseI18n, {
				locales: ['en', 'de']
			}));

			var model = new Model({
				name: {
					en: 'hello',
					de: 'hallo'
				}
			});

			model.save(function (err, model) {
				var modelWithReference = new ModelWithReference({
					name: {
						en: 'hello',
						de: 'hallo'
					},
					reference: model._id
				});
				modelWithReference.save(function (err, modelWithReference) {
					model.name.en.should.equal('hello');
					model.name.de.should.equal('hallo');

					var json = Model.schema.methods.toJSONLocalized(model, 'de');
					json.name.en.should.equal('hello');
					json.name.de.should.equal('hallo');
					json.name.localized.should.equal('hallo');

					var obj = Model.schema.methods.toObjectLocalized(model, 'en');
					obj.name.en.should.equal('hello');
					obj.name.de.should.equal('hallo');
					obj.name.localized.should.equal('hello');

					modelWithReference.populate('reference', function (err, doc) {
						doc.name.en.should.equal('hello');
						doc.name.de.should.equal('hallo');

						var json = Model.schema.methods.toJSONLocalized(doc, 'de');
						json.name.en.should.equal('hello');
						json.name.de.should.equal('hallo');
						json.name.localized.should.equal('hallo');
						json.reference.name.en.should.equal('hello');
						json.reference.name.de.should.equal('hallo');
						json.reference.name.localized.should.equal('hallo');

						var obj = Model.schema.methods.toObjectLocalized(doc, 'en');
						obj.name.en.should.equal('hello');
						obj.name.de.should.equal('hallo');
						obj.name.localized.should.equal('hello');
						obj.reference.name.en.should.equal('hello');
						obj.reference.name.de.should.equal('hallo');
						obj.reference.name.localized.should.equal('hello');

						done();
					});

				});
			});

		});

	});

};