"use server";
import Course from "@/database/course.model";
import Lecture from "@/database/lecture.model";
import Lesson, { ILesson } from "@/database/lesson.model";
import { sendNotification } from "@/modules/notifications/actions";
import { CreateLessonParams, DeleteLessonParams } from "@/types";
import { ECourseStatus } from "@/types/enums";
import { FilterQuery } from "mongoose";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../mongoose";

export async function addLesson(params: CreateLessonParams) {
  try {
    connectToDatabase();
    const findLecture = await Lecture.findById(params.lectureId);
    if (!findLecture?._id) {
      throw new Error("Lecture not found");
    }
    const existLessonSlug = await Lesson.findOne({
      slug: params.slug,
      courseId: params.courseId,
    });

    const newLesson = new Lesson({
      ...params,
      _destroy: false,
      slug: existLessonSlug
        ? `${params.slug}-${new Date().getTime().toString().slice(-3)}`
        : params.slug,
    });
    await newLesson.save();
    findLecture.lessons.push(newLesson._id);
    await findLecture.save();
    revalidatePath(`/admin/course/content?slug=${params.slug}`);
    const course = await Course.findById(params.courseId).select(
      "title status"
    );
    if (!course || course.status !== ECourseStatus.APPROVED) return;
    await sendNotification({
      title: "Thông báo",
      content: `Khóa học <strong>${course.title}</strong> vừa có bài học mới.`,
      isSendAll: true,
    });
  } catch (error) {
    console.log(error);
  }
}
export async function deleteLesson({
  lessonId,
  lectureId,
  path,
}: DeleteLessonParams) {
  try {
    connectToDatabase();
    // const findLecture = await Lecture.findById(lectureId);
    // if (!findLecture) {
    //   throw new Error("Không tìm thấy chương học");
    // }
    await Lesson.findByIdAndUpdate(lessonId, { _destroy: true });
    // findLecture.lessons = findLecture.lessons.filter(
    //   (id: string) => id.toString() !== lessonId
    // );
    // await findLecture.save();
    revalidatePath(path);
  } catch (error) {
    console.log(error);
  }
}

export async function getLessonsByLectureId(lectureId: string) {
  try {
    connectToDatabase();
    const lessons = await Lesson.find({ lectureId });
    return lessons;
  } catch (error) {
    console.log(error);
  }
}
export async function getLessonBySlug(slug: string, course?: string) {
  try {
    connectToDatabase();
    const query: FilterQuery<typeof Lesson> = {
      slug,
      _destroy: false,
    };
    const findCourse = await Course.findOne({ slug: course });
    if (findCourse) query.courseId = findCourse._id.toString();
    const lesson = await Lesson.findOne(query)
      .select("title content video courseId lectureId iframe")
      .populate({
        path: "courseId",
        model: Course,
        select: "id slug",
      });
    return lesson;
  } catch (error) {
    console.log(error);
  }
}
export async function getLessonByCourseId(
  courseId: string
): Promise<ILesson[] | undefined> {
  try {
    connectToDatabase();
    const lessons = await Lesson.find({ courseId, _destroy: false });
    return lessons;
  } catch (error) {
    console.log(error);
  }
}
export async function getLessonCount(
  courseId: string
): Promise<number | undefined> {
  try {
    connectToDatabase();
    // count all lessons in course
    const count = await Lesson.countDocuments({ courseId, _destroy: false });
    return count;
  } catch (error) {
    console.log(error);
  }
}
export async function getCourseIdByLesson(slug: string) {
  try {
    connectToDatabase();
    const lesson = await Lesson.findOne({ slug });
    if (!lesson) return;
    return lesson.courseId;
  } catch (error) {
    console.log(error);
  }
}
export async function getAllLessonByCourseId(courseId: string) {
  try {
    connectToDatabase();
    const lesson = await Lesson.find({ courseId }).select("title slug");
    if (!lesson) return [];
    return lesson;
  } catch (error) {
    console.log(error);
  }
}
export async function getAllLectureByCourseId(courseId: string) {
  try {
    connectToDatabase();
    const lecture = await Lecture.find({ courseId }).select("title slug");
    if (!lecture) return [];
    return lecture;
  } catch (error) {
    console.log(error);
  }
}
