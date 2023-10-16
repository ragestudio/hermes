const path = require("path")
const fs = require("fs")

const { program, Command, Argument } = require("commander")

const internalCommandsPath = path.resolve(__dirname, "../commands")

function readCommands(entry) {
    let map = []

    if (fs.existsSync(entry)) {
        const stats = fs.lstatSync(internalCommandsPath)

        const isFile = stats.isFile()
        const isDir = stats.isDirectory()

        if (!isFile && !isDir) {
            // unsupported method
            return map
        }

        if (isDir) {
            fs.readdirSync(internalCommandsPath).forEach((namespace) => {
                const commandDir = path.resolve(internalCommandsPath, namespace)

                map.push(require(commandDir))
            })
        }

        if (isFile) {
            const _module = require(entry)

            if (Array.isArray(_module)) {
                map = _module
            } else {
                map.push(_module)
            }
        }
    }

    return map
}


readCommands(internalCommandsPath).forEach(item => {
    if (typeof item.command === "undefined") {
        return false
    }

    const cmd = new Command(item.command).action(item.exec)

    if (Array.isArray(item.arguments)) {
        item.arguments.forEach(arg => {
            if (typeof arg === "string") {
                cmd.addArgument(new Argument(arg))
            } else {
                const _argument = new Argument(arg.argument, arg.description)

                if (arg.default) {
                    _argument.default(arg.default)
                }

                cmd.addArgument(_argument)
            }
        })
    }

    if (Array.isArray(item.options)) {
        item.options.forEach(opt => {
            if (typeof opt === "string") {
                cmd.option(opt)
            } else {
                cmd.option(opt.option, opt.description, opt.default)
            }
        })
    }

    program.addCommand(cmd)
})

program.parse()