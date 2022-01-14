const fs = require('fs')
const path = require('path')
const JSZip = require('jszip')

// Thanks https://github.com/lostandfound/epub-zip
// for the initial idea for this.
// Note that we use path.posix (not just path) because
// EPUBCheck needs forward slashes in paths, otherwise
// it cannot find META-INF/container.xml in epubs
// generated on Windows machines.
function getFiles (root, files, base) {
  'use strict'

  base = base || ''
  files = files || []
  const directory = path.posix.join(root, base)

  // Files and folders to skip. For instance,
  // don't add the mimetype file, we'll create that
  // when we zip, so that we can add it specially.
  const skipFiles = /^(mimetype)$/

  if (fs.lstatSync(directory).isDirectory()) {
    fs.readdirSync(directory)
      .forEach(function (file) {
        if (!file.match(skipFiles)) {
          getFiles(root, files, path.posix.join(base, file))
        }
      })
  } else {
    files.push(base)
  }
  return files
}

module.exports = function (uncompressedEpubDirectory,
  callback, callbackArgs) {
  'use strict'

  // Check if the directory exists
  if (!uncompressedEpubDirectory) {
    throw new Error('Sorry, could not find ' + uncompressedEpubDirectory + '.')
  }

  // Get the files to zip
  const files = getFiles(uncompressedEpubDirectory)

  // Create a new instance of JSZip
  const zip = new JSZip()

  // Add an uncompressed mimetype file first
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  // Add all the files
  files.forEach(function (file) {
    console.log('Adding ' + file + ' to zip.')
    zip.file(file, fs.readFileSync(path.posix.join(uncompressedEpubDirectory, file)), { compression: 'DEFLATE' })
  })

  // Write the zip file to disk
  zip
    .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(uncompressedEpubDirectory + '.zip'))
    .on('finish', function () {
      // JSZip generates a readable stream with a "end" event,
      // but is piped here in a writable stream which emits a "finish" event.
      console.log(uncompressedEpubDirectory + '.zip created.')

      if (callback) {
        callback(callbackArgs)
      }
    })
}

// Make this runnable from the command line
// https://www.npmjs.com/package/make-runnable
// This must be at the end of the file.
require('make-runnable/custom')({
  printOutputFrame: false
})
