module.exports = function(grunt) {
  
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    requirejs: {
      compile: {
        options: {
          baseUrl: 'app/js',
          name: "main",
          out: 'dist/js/main.js',
          fileExclusionRegExp: /^(r|build)\$/,
          optimizeCss: 'standard',
          removeCombined: true,
          mainConfigFile: 'app/js/main.js',
          "paths": {
            "socket.io": "empty:"
          }
        }

      }
    },
    nodemon: {
      dev: {
        script: 'server.js'
      }
    },
    cssmin: {
      dist: {
        files: {
          'dist/css/styles.min.css': 'app/css/styles.css'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-requirejs');

  grunt.registerTask('default', ['requirejs', 'cssmin']);
  grunt.registerTask('run', ['nodemon']);
};