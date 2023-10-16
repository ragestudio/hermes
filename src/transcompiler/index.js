const fastGlob = require("fast-glob")
const { exists, mkdir, readFile, writeFile } = require("mz/fs")
const { dirname, join, relative, resolve, extname } = require("node:path")
const fs = require("node:fs")

const { transform } = require("sucrase")

const supportedExtensions = [".js", ".jsx", ".ts", ".tsx"]

async function build(params) {
    const options = {
        outDirPath: params.outputDir,
        srcDirPath: params.inputDir,
        project: params.project,
        outExtension: params.outExtension,
        ignoreSources: params.ignoreSources ?? [],
        excludeSources: params.excludeSources ?? [],
        quiet: params.quiet,
        sucraseOptions: {
            transforms: typeof params.transforms === "string" ? params.transforms.split(",") : params.transforms,
            enableLegacyTypeScriptModuleInterop: params.enableLegacyTypescriptModuleInterop,
            enableLegacyBabel5ModuleInterop: params.enableLegacyBabel5ModuleInterop,
            jsxPragma: params.jsxPragma || "React.createElement",
            jsxFragmentPragma: params.jsxFragmentPragma || "React.Fragment",
            production: params.production,
        },
    }

    if (!(await exists(options.outDirPath))) {
        await mkdir(options.outDirPath)
    }

    if (Array.isArray(options.ignoreSources)) {
        options.ignoreSources = options.ignoreSources.map(s => resolve(options.srcDirPath, s))
        options.ignoreSources = await fastGlob(options.ignoreSources, { absolute: true })
    }

    return buildDirectory(options)
}

async function buildDirectory(options) {
    let files = undefined

    if (options.outDirPath && options.srcDirPath) {
        const patterns = [`${options.srcDirPath}/**/**`]

        if (Array.isArray(options.excludeSources)) {
            options.excludeSources.forEach(s => patterns.push(`!${resolve(options.srcDirPath, "..", s)}`))
        }

        files = await fastGlob(patterns, { absolute: true })
        files = files.map((file) => {
            return {
                srcPath: file,
                outPath: join(options.outDirPath, relative(options.srcDirPath, file)),
            }
        })
    }

    for (const file of files) {
        await buildFile(file.srcPath, file.outPath, options)
    }
}

async function buildFile(srcPath, outPath, options) {
    const srcExtension = extname(srcPath)
    const isSupportedExtension = supportedExtensions.includes(srcExtension)

    let code = (await readFile(srcPath)).toString()

    if (!options.ignoreSources.includes(srcPath) && isSupportedExtension) {
        if (options.outExtension) {
            outPath = outPath.replace(/\.\w+$/, `.${options.outExtension}`)
        }

        if (!options.quiet) {
            console.log(`${srcPath} -> ${outPath}`)
        }

        code = transform(code, { ...options.sucraseOptions, filePath: srcPath }).code
    }

    const outDirname = dirname(outPath)

    if (!(await exists(outDirname))) {
        fs.mkdirSync(outDirname, { recursive: true })
    }

    await writeFile(outPath, code)
}

module.exports = {
    build,
    buildFile,
    buildDirectory,
    supportedExtensions,
    default: build
}