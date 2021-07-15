let markdown = {
    // Settings to rewrite links and fixe some char
    "substitution": {
        // Liste of char replacement
        "chars": {
            "'": "",      // Replace quote  with nothing
            "`": "",      // Replace        with nothing
            ":": "",      // Replace colon  with nothing
            "-{2,}": "-"  // Replace double dash by one
        },
        // List of function to executes with arg
        // This will be the stringMacth (title text)
        // Name is for debugging
        "functions": [
            {
                function: function () {
                    let str = this;
                    // Removes
                    str = str.replace(/[`()]/g, '');
                    // replaces
                    str = str.replace(/(\s)/g, '-');
                    return str;
                }, name: "specialCharRemove",
                args: []
            },
            {
                function: function () {
                    return this.toLowerCase();
                }, name: "toLowerCase",
                args: []
            },
            {
                function: function () {
                    return encodeURI(this);
                }, name: "encodeURI",
                args: []
            }
        ]
    },
};

module.exports = markdown;