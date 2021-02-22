const autoprefixer = require('autoprefixer');
const path = require('path');

module.exports = [{
  entry: './sakurako/app.scss',
  output: {
    // This is necessary for webpack to compile
    // But we never use style-bundle.js
    filename: 'style-bundle.js',
    path: path.resolve('../public', 'dist'),
    publicPath: '/../public/dist'
  },
  module: {
    rules: [{
      test: /\.scss$/,
      use: [
        {
          loader: 'file-loader',
          options: {
            name: 'bundle.css',
          },
        },
        { loader: 'extract-loader' },
        { loader: 'css-loader' },
        { loader: 'postcss-loader',
          options: {
             plugins: () => [autoprefixer({ grid: false })]
          }
        },
        {
          loader: 'sass-loader',
          options: {
            includePaths: ['node_modules']
          }
        },
      ]
    }]
  },
}];

module.exports.push({
  entry: './sakurako/app.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve('../public', 'dist'),
    publicPath: '/../public/dist'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      query: {
        presets: ['es2015']
      }
    }]
  },
});


module.exports.push({
  entry: './sakurako/home.js',
  output: {
    filename: 'homeBundle.js',
    path: path.resolve('../public', 'dist'),
    publicPath: '/../public/dist'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      query: {
        presets: ['es2015']
      }
    }]
  },
});

module.exports.push({
  entry: './sakurako/customer.js',
  output: {
    filename: 'customerBundle.js',
    path: path.resolve('../public', 'dist'),
    publicPath: '/../public/dist'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      query: {
        presets: ['es2015']
      }
    }]
  },
});

module.exports.push({
  entry: './sakurako/provider.js',
  output: {
    filename: 'providerBundle.js',
    path: path.resolve('../public', 'dist'),
    publicPath: '/../public/dist'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      query: {
        presets: ['es2015']
      }
    }]
  },
});

module.exports.push({
  entry: './sakurako/pending.js',
  output: {
    filename: 'pendingBundle.js',
    path: path.resolve('../public', 'dist'),
    publicPath: '/../public/dist'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      query: {
        presets: ['es2015']
      }
    }]
  },
});

module.exports.push({
  entry: './sakurako/remit.js',
  output: {
    filename: 'remitBundle.js',
    path: path.resolve('../public', 'dist'),
    publicPath: '/../public/dist'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      query: {
        presets: ['es2015']
      }
    }]
  },
});

module.exports.push({
  entry: './sakurako/review.js',
  output: {
    filename: 'reviewBundle.js',
    path: path.resolve('../public', 'dist'),
    publicPath: '/../public/dist'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      query: {
        presets: ['es2015']
      }
    }]
  },
});