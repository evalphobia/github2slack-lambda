// Karma configuration
module.exports = function(config) {
  config.set({

    basePath: '',
    frameworks: ['jasmine'],
    plugins : [
               'karma-chrome-launcher',
               // 'karma-script-launcher',
               'karma-jasmine',
               'karma-requirejs'
    ],

    files: [
      'node_modules/requirejs/require.js',
      'node_modules/karma-requirejs/lib/adapter.js',
      'index.js',
      'test/*Spec.js'
    ],
    exclude: [
    ],
    preprocessors: {
    },

    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
