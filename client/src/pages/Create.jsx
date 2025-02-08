import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "react-router-dom"

const ILSI_CLASSES = [
  "Employee Completion Letter",
  "Employee Offer Letter",
  "Meeting Room Booking",
]

const descriptions = {
  "Employee Completion Letter": "A formal document issued to employees upon successful completion of their employment period, confirming their tenure and performance.",
  "Employee Offer Letter": "A formal employment offer document detailing the terms and conditions of employment, compensation, and other benefits.",
  "Meeting Room Booking": "A form to reserve meeting rooms and facilities for business meetings, presentations, or events.",
}

export default function Create() {
  return (
    <>
      <div className="flex">
          <div className="container mx-auto px-10 py-10">
              <h1 className="text-3xl font-bold text-center mb-10">Legal Document Categories</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ILSI_CLASSES.map((category) => (
                  <Link to={`/create/${category}`} state={{ category }} key={category}>
                      <Card className="flex flex-col h-full transition-transform duration-300 ease-in-out hover:scale-105 hover:shadow-lg">
                          <CardHeader>
                          <CardTitle>{category}</CardTitle>
                          </CardHeader>
                          <CardContent className="flex-grow">
                          <CardDescription>{descriptions[category]}</CardDescription>
                          </CardContent>
                      </Card>
                  </Link>
                  ))}
              </div>
          </div>
      </div>
    </>
  )
}