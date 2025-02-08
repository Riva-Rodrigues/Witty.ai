import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Upload } from 'lucide-react'

export default function OnboardingPage() {
  const [separator, setSeparator] = useState(',')
  const [zomatoUrl, setZomatoUrl] = useState('')
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!file) {
      setError('Please upload a CSV file')
      return
    }
    // Here you would typically send the form data to your server
    console.log('Form submitted', { file, separator, zomatoUrl })
  }

  return (
    <div className="w-full h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Onboarding Form</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="csv-upload">CSV Upload</Label>
                    <div
                    {...getRootProps()}
                    className={`mt-1 p-6 border-2 border-dashed rounded-md text-center cursor-pointer ${
                        isDragActive ? 'border-primary' : 'border-muted'
                    }`}
                    >
                    <input {...getInputProps()} id="csv-upload" />
                    {file ? (
                        <p className="text-sm">{file.name}</p>
                    ) : (
                        <div className="space-y-2">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="text-sm">Drag & drop a CSV file here, or click to select one</p>
                        </div>
                    )}
                    </div>
                    {error && (
                    <p className="mt-2 text-sm text-destructive flex items-center">
                        <AlertCircle className="mr-1 h-4 w-4" />
                        {error}
                    </p>
                    )}
                </div>
                <div>
                    <Label htmlFor="separator">CSV Separator</Label>
                    <Input
                    id="separator"
                    value={separator}
                    onChange={(e) => setSeparator(e.target.value)}
                    placeholder="Enter CSV separator"
                    className="mt-1"
                    />
                </div>
                <div>
                    <Label htmlFor="zomato-url">Zomato URL</Label>
                    <Input
                    id="zomato-url"
                    value={zomatoUrl}
                    onChange={(e) => setZomatoUrl(e.target.value)}
                    placeholder="Enter Zomato URL to fetch reviews"
                    className="mt-1"
                    />
                </div>
                </form>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSubmit} className="w-full">Submit</Button>
            </CardFooter>
        </Card>
    </div>
  )
}