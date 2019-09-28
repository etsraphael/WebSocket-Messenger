const path = require('path');
const PrettierPlugin = require("prettier-webpack-plugin");


module.exports = {
    mode: 'production',
    entry: './server.ts',
    devtool: 'inline-source-map',
    devServer: {
        contentBase: [
            path.resolve(__dirname, './dist'),
        ]

    },
    module: {
        exprContextCritical: false,
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    plugins: [
        new PrettierPlugin({
            printWidth: 80,               // Specify the length of line that the printer will wrap on.
            tabWidth: 2,                  // Specify the number of spaces per indentation-level.
            useTabs: false,               // Indent lines with tabs instead of spaces.
            semi: true,                   // Print semicolons at the ends of statements.
            encoding: 'utf-8',            // Which encoding scheme to use on files
            extensions: [".ts"]  // Which file extensions to process
        })
    ],
    resolve: {
        modules: ['node_modules'],
        extensions: ['.js', '.ts']
    },
    output: {
        filename: 'bundle.js',
        // eslint-disable-next-line no-undef
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/'
    },
    target: 'node',
};