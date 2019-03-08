const path=require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
var isProduction=(process.env.NODE_ENV === 'production') || (process.argv.indexOf('-p') !== -1);

let outdir="debug";
if (isProduction) {
    outdir="release";
}
let devtool="inline-source-map";
let resolveAlias={};
if (isProduction) {
    devtool="";
    resolveAlias['react$']=__dirname+"/node_modules/react/cjs/react.production.min.js";
    resolveAlias['react-dom$']=__dirname+"/node_modules/react-dom/cjs/react-dom.production.min.js";
}
module.exports = function(env) {
    return {
        context: path.join(__dirname, 'src'),
        entry: [
            './index.js',
        ],
        output: {
            path: ((env && env.outpath) ? path.join(env.outpath,outdir) : path.join(__dirname, 'build',outdir)),
            filename: 'bundle.js',
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: [
                        'babel-loader',
                    ],
                },
                {
                    test: /node_modules.react-toolbox.*\.css$/,
                    use: [
                        "style-loader",
                        {
                            loader: "css-loader",
                            options: {
                                modules: true, // default is false
                                sourceMap: true,
                                importLoaders: 1,
                                localIdentName: "[name]--[local]--[hash:base64:8]"
                            }
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                config: {},
                                ident: 'postcss'
                            }
                        }
                    ]
                },

                {
                    test: /\.css$/,
                    exclude: /node_modules.react-toolbox/,
                    use: [{
                        loader: MiniCssExtractPlugin.loader
                        },
                        'css-loader']
                },

                {
                    test: /\.less$/,
                    exclude: /theme..*less/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader
                        },
                        "css-loader?-url",
                        {
                            loader:"less-loader",
                            options:{
                                javascriptEnabled:true
                            }
                        }]
                },
                {
                    test: /theme.*\.less$/,
                    use: ["style-loader",
                        {
                            loader: "css-loader",
                            options: {
                                modules: true, // default is false
                                sourceMap: true,
                                importLoaders: 1,
                                localIdentName: "[name]--[local]--[hash:base64:8]"
                            }
                        },
                        {
                            loader:"less-loader",
                            options:{
                                javascriptEnabled:true
                            }
                        }
                    ]
                },

            ]
        },
        resolve: {
            alias: resolveAlias,
            modules: [
                path.join(__dirname, 'node_modules'),
            ],
        },
        plugins: [
            new CopyWebpackPlugin([
                // {output}/file.txt
                {from: '../public'}

            ]),
            new CopyWebpackPlugin(isProduction?[]:[
                // {output}/file.txt
                {from: '../test'}

            ]),
            new MiniCssExtractPlugin( {filename:"index.css"}),
        ],
        devtool: devtool
    }
};
