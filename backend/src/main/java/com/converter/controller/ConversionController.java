package com.converter.controller;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@RestController
@RequestMapping("/api/convert")
public class ConversionController {

    private static final Logger logger = LoggerFactory.getLogger(ConversionController.class);

    /**
     * Converts a PDF file into a ZIP package containing JPEG images of each page.
     */
    @PostMapping(value = "/pdf-to-jpeg", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> convertPdfToJpeg(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            logger.warn("PDF-to-JPEG: Uploaded file is empty");
            return ResponseEntity.badRequest().body("Uploaded file is empty".getBytes());
        }

        logger.info("PDF-to-JPEG: Processing file {}", file.getOriginalFilename());

        try (PDDocument document = Loader.loadPDF(file.getBytes());
             ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {

            PDFRenderer renderer = new PDFRenderer(document);
            int pageCount = document.getNumberOfPages();
            logger.info("PDF-to-JPEG: PDF has {} pages", pageCount);

            for (int i = 0; i < pageCount; i++) {
                // Render image at 150 DPI for good balance between quality and performance
                BufferedImage image = renderer.renderImageWithDPI(i, 150);
                
                ZipEntry entry = new ZipEntry(String.format("page_%03d.jpg", i + 1));
                zos.putNextEntry(entry);
                
                // Write image data directly into the zip output stream
                ImageIO.write(image, "jpg", zos);
                zos.closeEntry();
            }

            zos.finish();
            byte[] zipBytes = baos.toByteArray();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "converted_images.zip");
            headers.setContentLength(zipBytes.length);

            logger.info("PDF-to-JPEG: Successfully generated ZIP file containing page images");
            return new ResponseEntity<>(zipBytes, headers, HttpStatus.OK);

        } catch (IOException e) {
            logger.error("PDF-to-JPEG: Error occurred during conversion", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(("Error converting PDF to JPEGs: " + e.getMessage()).getBytes());
        }
    }

    /**
     * Converts a list of JPEG/PNG images into a single PDF document.
     */
    @PostMapping(value = "/jpeg-to-pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> convertJpegToPdf(@RequestParam("files") List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            logger.warn("JPEG-to-PDF: No files uploaded");
            return ResponseEntity.badRequest().body("No files uploaded".getBytes());
        }

        logger.info("JPEG-to-PDF: Processing {} files", files.size());

        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            for (MultipartFile file : files) {
                if (file.isEmpty()) {
                    continue;
                }

                byte[] bytes = file.getBytes();
                // Create image object
                PDImageXObject image = PDImageXObject.createFromByteArray(document, bytes, file.getOriginalFilename());

                // Standard A4 layout: 595 x 842 points
                float pageWidth = PDRectangle.A4.getWidth();
                float pageHeight = PDRectangle.A4.getHeight();
                PDPage page = new PDPage(PDRectangle.A4);
                document.addPage(page);

                // Calculate image dimensions to fit standard A4 while keeping aspect ratio
                float imgWidth = image.getWidth();
                float imgHeight = image.getHeight();
                float scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);

                // Target width & height scaled
                float width = imgWidth * scale;
                float height = imgHeight * scale;

                // Center the image on page
                float x = (pageWidth - width) / 2;
                float y = (pageHeight - height) / 2;

                try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                    contentStream.drawImage(image, x, y, width, height);
                }
            }

            document.save(baos);
            byte[] pdfBytes = baos.toByteArray();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "converted_images.pdf");
            headers.setContentLength(pdfBytes.length);

            logger.info("JPEG-to-PDF: Successfully generated PDF file");
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

        } catch (IOException e) {
            logger.error("JPEG-to-PDF: Error occurred during conversion", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(("Error converting images to PDF: " + e.getMessage()).getBytes());
        }
    }
}
